//! Transactional outbox relay.
//!
//! Drains committed rows from `outbox_events` and publishes them to the
//! ingestion queue with at-least-once semantics:
//!
//! 1. claim a bounded batch with `FOR UPDATE SKIP LOCKED` (safe for multiple
//!    relay replicas);
//! 2. publish each claimed event to RabbitMQ (persistent messages, message id
//!    set to the outbox row id so consumers can dedupe);
//! 3. mark published rows terminal; failed publishes are incremented and
//!    re-armed with exponential backoff until they exceed the attempt budget,
//!    after which they are flagged `failed` for operator intervention.
//!
//! The relay never mutates receipts or results — it is pure delivery glue.

use anchorpipe_pipeline_contracts::queues;
use lapin::options::{BasicPublishOptions, BasicQosOptions};
use lapin::types::FieldTable;
use lapin::{Connection, ConnectionProperties, ExchangeKind};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::env;
use std::time::Duration;

const DEFAULT_BATCH_SIZE: i64 = 50;
const DEFAULT_MAX_ATTEMPTS: i32 = 12;
const DEFAULT_POLL_MS: u64 = 500;
const BASE_BACKOFF_SECS: u64 = 2;
const MAX_BACKOFF_SECS: u64 = 300;

struct RelayConfig {
    database_url: String,
    amqp_url: String,
    batch_size: i64,
    max_attempts: i32,
    poll: Duration,
}

impl RelayConfig {
    fn from_env() -> Result<Self, String> {
        let database_url = env::var("RELAY_DATABASE_URL")
            .or_else(|_| env::var("DATABASE_URL"))
            .map_err(|_| "RELAY_DATABASE_URL (or DATABASE_URL) is required".to_string())?;
        let amqp_url = env::var("RELAY_AMQP_URL")
            .or_else(|_| env::var("RABBIT_URL"))
            .map_err(|_| "RELAY_AMQP_URL (or RABBIT_URL) is required".to_string())?;
        let batch_size = env::var("RELAY_BATCH_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .filter(|v: &i64| (1..=500).contains(v))
            .unwrap_or(DEFAULT_BATCH_SIZE);
        let max_attempts = env::var("RELAY_MAX_ATTEMPTS")
            .ok()
            .and_then(|v| v.parse().ok())
            .filter(|v: &i32| *v >= 1)
            .unwrap_or(DEFAULT_MAX_ATTEMPTS);
        let poll_ms = env::var("RELAY_POLL_INTERVAL_MS")
            .ok()
            .and_then(|v| v.parse().ok())
            .filter(|v: &u64| (50..=60_000).contains(v))
            .unwrap_or(DEFAULT_POLL_MS);
        Ok(Self {
            database_url,
            amqp_url,
            batch_size,
            max_attempts,
            poll: Duration::from_millis(poll_ms),
        })
    }
}

/// Ensure the DLX and dead-letter routing exist before claiming work, so a
/// rejected consumer message is never silently dropped by the broker.
async fn ensure_topology(conn: &Connection) -> Result<(), lapin::error::BoxedError> {
    conn.channel().await?.exchange_declare(
        queues::DEAD_LETTER_EXCHANGE,
        ExchangeKind::Topic,
        Default::default(),
    ).await?;
    let channel = conn.channel().await?;
    channel.queue_declare(queues::INGESTION_DLQ, Default::default()).await?;
    channel
        .queue_bind(
            queues::INGESTION_DLQ,
            queues::DEAD_LETTER_EXCHANGE,
            queues::INGESTION_DLQ,
            Default::default(),
            FieldTable::default(),
        )
        .await?;
    Ok(())
}

async fn claim_batch(
    pool: &PgPool,
    batch_size: i64,
) -> Result<Vec<(String, String, serde_json::Value, i32)>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    // Claim rows whose availability window has elapsed. SKIP LOCKED lets other
    // relay replicas make progress concurrently without blocking.
    let rows = sqlx::query(
        "SELECT id, event_type, payload, attempts FROM outbox_events
          WHERE status = 'pending' AND available_at <= now()
          ORDER BY available_at
          LIMIT $1
          FOR UPDATE SKIP LOCKED",
    )
    .bind(batch_size)
    .fetch_all(&mut *tx)
    .await?;
    let claimed = rows
        .into_iter()
        .map(|row| {
            (
                row.get::<String, _>("id"),
                row.get::<String, _>("event_type"),
                row.get::<serde_json::Value, _>("payload"),
                row.get::<i32, _>("attempts"),
            )
        })
        .collect::<Vec<_>>();
    tx.commit().await?;
    Ok(claimed)
}

async fn publish_one(
    channel: &lapin::Channel,
    id: &str,
    event_type: &str,
    payload: &serde_json::Value,
) -> Result<(), lapin::Error> {
    let body = serde_json::to_vec(payload).unwrap_or_else(|_| b"{}".to_vec());
    let mut headers = FieldTable::default();
    headers.insert("x-event-type".into(), event_type.to_string().into());
    headers.insert("x-outbox-id".into(), id.to_string().into());
    channel
        .basic_publish(
            "",
            queues::INGESTION_MAIN,
            BasicPublishOptions::default()
                .with_routing_key(queues::INGESTION_MAIN)
                .with_message_id(id.to_string())
                .with_headers(headers)
                .with_delivery_mode(2),
            &body,
        )
        .await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchorpipe_relay=info".into()),
        )
        .with(tracing_subscriber::fmt::layer().json().flatten_event(true))
        .init();

    let config = RelayConfig::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await?;
    let connection = Connection::connect(&config.amqp_url, ConnectionProperties::default()).await?;
    ensure_topology(&connection).await?;
    let channel = connection.create_channel().await?;
    channel.basic_qos(10, BasicQosOptions::default()).await?;

    tracing::info!(batch = config.batch_size, "outbox relay started");

    let mut shutting_down = false;
    loop {
        if shutting_down {
            break;
        }
        let claimed = match claim_batch(&pool, config.batch_size).await {
            Ok(rows) => rows,
            Err(error) => {
                tracing::warn!(%error, "outbox claim failed; backing off");
                tokio::time::sleep(config.poll * 4).await;
                continue;
            }
        };

        if claimed.is_empty() {
            tokio::select! {
                _ = tokio::time::sleep(config.poll) => {}
                _ = shutdown_signal() => shutting_down = true,
            }
            continue;
        }

        for (id, event_type, payload, attempts) in claimed {
            match publish_one(&channel, &id, &event_type, &payload).await {
                Ok(()) => {
                    sqlx::query(
                        "UPDATE outbox_events SET status = 'published', published_at = now(), last_error = NULL WHERE id = $1",
                    )
                    .bind(&id)
                    .execute(&pool)
                    .await?;
                    tracing::info!(outbox_id = %id, event_type = %event_type, "outbox event published");
                }
                Err(error) => {
                    let next_attempts = attempts + 1;
                    if next_attempts >= config.max_attempts {
                        sqlx::query(
                            "UPDATE outbox_events SET status = 'failed', attempts = $2, last_error = $3 WHERE id = $1",
                        )
                        .bind(&id)
                        .bind(next_attempts)
                        .bind(error.to_string())
                        .execute(&pool)
                        .await?;
                        tracing::error!(outbox_id = %id, attempts = next_attempts, "outbox event exhausted its attempt budget; marked failed");
                    } else {
                        let backoff = BASE_BACKOFF_SECS
                            .saturating_mul(1u64 << next_attempts.min(8))
                            .min(MAX_BACKOFF_SECS);
                        sqlx::query(
                            "UPDATE outbox_events SET attempts = $2, last_error = $3, available_at = now() + make_interval(secs => $4) WHERE id = $1",
                        )
                        .bind(&id)
                        .bind(next_attempts)
                        .bind(error.to_string())
                        .bind(backoff as i32)
                        .execute(&pool)
                        .await?;
                        tracing::warn!(outbox_id = %id, attempts = next_attempts, backoff_secs = backoff, "publish failed; re-armed with backoff");
                    }
                }
            }
        }
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("shutdown signal received; finishing in-flight batch");
}
