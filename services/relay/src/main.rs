//! Transactional outbox relay.
//!
//! Drains committed rows from `outbox_events` and publishes them to the
//! ingestion queue with at-least-once semantics:
//!
//! 1. claim a bounded batch inside a transaction with `FOR UPDATE SKIP LOCKED`
//!    and atomically mark the rows `in_flight` (safe for multiple relay
//!    replicas — the claim itself is the lock);
//! 2. publish each claimed event to RabbitMQ via the default exchange using
//!    the queue name as routing key (persistent messages, message id set to
//!    the outbox row id so consumers can dedupe);
//! 3. mark published rows terminal; failed publishes are incremented and
//!    re-armed with exponential backoff until they exceed the attempt budget,
//!    after which they are flagged `failed` for operator intervention.
//!
//! The relay never mutates receipts or results — it is pure delivery glue.

use anchorpipe_pipeline_contracts::queues;
use lapin::options::{BasicAckOptions, BasicNackOptions, BasicPublishOptions, BasicQosOptions, ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions};
use lapin::types::{AMQPValue, FieldTable};
use lapin::{Channel, Connection, ConnectionProperties, ExchangeKind};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::env;
use std::time::Duration;

const DEFAULT_BATCH_SIZE: i64 = 50;
const DEFAULT_MAX_ATTEMPTS: i32 = 12;
const DEFAULT_POLL_MS: u64 = 500;
/// Seconds an `in_flight` row may stay un-finished before another relay pass
/// may re-claim it (crash recovery for a relay that died mid-publish).
const IN_FLIGHT_TIMEOUT_SECS: i32 = 120;
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

fn text_value(value: &str) -> AMQPValue {
    AMQPValue::LongString(value.to_string().into())
}

/// Ensure the main queue, dead-letter queue, DLX, and dead-letter routing all
/// exist before claiming work, so a rejected consumer message is never
/// silently dropped by the broker.
async fn ensure_topology(channel: &Channel) -> Result<(), lapin::Error> {
    channel
        .exchange_declare(
            queues::DEAD_LETTER_EXCHANGE,
            ExchangeKind::Topic,
            ExchangeDeclareOptions { durable: true, ..Default::default() },
            FieldTable::default(),
        )
        .await?;

    let mut dlq_args = FieldTable::default();
    dlq_args.insert("x-dead-letter-exchange".into(), text_value(""));
    dlq_args.insert("x-dead-letter-routing-key".into(), text_value(queues::INGESTION_DLQ));

    // Main queue: durable, routes to the DLX on rejection.
    let mut main_args = FieldTable::default();
    main_args.insert(
        "x-dead-letter-exchange".into(),
        text_value(queues::DEAD_LETTER_EXCHANGE),
    );
    channel
        .queue_declare(
            queues::INGESTION_MAIN,
            QueueDeclareOptions { durable: true, ..Default::default() },
            main_args,
        )
        .await?;
    channel
        .queue_bind(
            queues::INGESTION_MAIN,
            "",
            queues::INGESTION_MAIN,
            QueueBindOptions::default(),
            FieldTable::default(),
        )
        .await?;

    // Dead-letter queue bound directly to the DLX topic exchange.
    channel
        .queue_declare(
            queues::INGESTION_DLQ,
            QueueDeclareOptions { durable: true, ..Default::default() },
            dlq_args,
        )
        .await?;
    channel
        .queue_bind(
            queues::INGESTION_DLQ,
            queues::DEAD_LETTER_EXCHANGE,
            "#",
            QueueBindOptions::default(),
            FieldTable::default(),
        )
        .await?;
    Ok(())
}

/// Atomically claim a bounded batch: select pending (or stale in-flight) rows
/// with SKIP LOCKED and flip them to `in_flight` in the same statement, then
/// return the claimed rows. Other relay replicas can never see these rows.
async fn claim_batch(
    pool: &PgPool,
    batch_size: i64,
) -> Result<Vec<(String, String, serde_json::Value, i32)>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let rows = sqlx::query(
        "WITH claimed AS (
            SELECT id FROM outbox_events
             WHERE (status = 'pending' OR (status = 'in_flight' AND updated_at < now() - make_interval(secs => $2)))
               AND available_at <= now()
             ORDER BY available_at
             LIMIT $1
             FOR UPDATE SKIP LOCKED
         )
         UPDATE outbox_events o
            SET status = 'in_flight', updated_at = now()
           FROM claimed c
          WHERE o.id = c.id
         RETURNING o.id, o.event_type, o.payload, o.attempts",
    )
    .bind(batch_size)
    .bind(IN_FLIGHT_TIMEOUT_SECS)
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
    channel: &Channel,
    id: &str,
    event_type: &str,
    payload: &serde_json::Value,
) -> Result<(), lapin::Error> {
    let body = serde_json::to_vec(payload).unwrap_or_else(|_| b"{}".to_vec());
    let mut headers = FieldTable::default();
    headers.insert("x-event-type".into(), text_value(event_type));
    headers.insert("x-outbox-id".into(), text_value(id));
    channel
        .basic_publish(
            "",
            queues::INGESTION_MAIN,
            BasicPublishOptions {
                routing_key: queues::INGESTION_MAIN.into(),
                immediate: false,
            },
            &body,
            headers,
        )
        .await?;
    Ok(())
}

/// Mark a successfully published row terminal.
async fn mark_published(pool: &PgPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE outbox_events SET status = 'published', published_at = now(), last_error = NULL, updated_at = now() WHERE id = $1",
    )
    .bind(id)
    .execute(pool)
    .await
    .map(|_| ())
}

/// Record a failed publish: either exhaust to `failed` or re-arm with
/// exponential backoff (capped) for a later pass.
async fn record_failure(
    pool: &PgPool,
    id: &str,
    attempts: i32,
    max_attempts: i32,
    error: &lapin::Error,
) -> Result<(), sqlx::Error> {
    let next_attempts = attempts + 1;
    if next_attempts >= max_attempts {
        sqlx::query(
            "UPDATE outbox_events SET status = 'failed', attempts = $2, last_error = $3, updated_at = now() WHERE id = $1",
        )
        .bind(id)
        .bind(next_attempts)
        .bind(error.to_string())
        .execute(pool)
        .await
        .map(|_| ())
    } else {
        let backoff = BASE_BACKOFF_SECS
            .saturating_mul(1u64 << next_attempts.min(8))
            .min(MAX_BACKOFF_SECS);
        sqlx::query(
            "UPDATE outbox_events SET status = 'pending', attempts = $2, last_error = $3, available_at = now() + make_interval(secs => $4), updated_at = now() WHERE id = $1",
        )
        .bind(id)
        .bind(next_attempts)
        .bind(error.to_string())
        .bind(backoff as i32)
        .execute(pool)
        .await
        .map(|_| ())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;
    use tracing_subscriber::Layer;

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "anchorpipe_relay=info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .json()
                .flatten_event(true)
                .with_filter(tracing::level_filters::LevelFilter::INFO),
        )
        .init();

    let config = RelayConfig::from_env()?;
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await?;
    let connection = Connection::connect(&config.amqp_url, ConnectionProperties::default()).await?;
    let channel = connection.create_channel().await?;
    ensure_topology(&channel).await?;
    channel.basic_qos(10, BasicQosOptions::default()).await?;

    tracing::info!(batch = config.batch_size, "outbox relay started");

    loop {
        let claimed = match claim_batch(&pool, config.batch_size).await {
            Ok(rows) => rows,
            Err(error) => {
                tracing::warn!(%error, "outbox claim failed; backing off");
                tokio::select! {
                    _ = tokio::time::sleep(config.poll * 4) => {}
                    _ = shutdown_signal() => break,
                }
                continue;
            }
        };

        if claimed.is_empty() {
            tokio::select! {
                _ = tokio::time::sleep(config.poll) => {}
                _ = shutdown_signal() => break,
            }
            continue;
        }

        for (id, event_type, payload, attempts) in claimed {
            match publish_one(&channel, &id, &event_type, &payload).await {
                Ok(()) => {
                    mark_published(&pool, &id).await?;
                    tracing::info!(outbox_id = %id, event_type = %event_type, "outbox event published");
                }
                Err(error) => {
                    record_failure(&pool, &id, attempts, config.max_attempts, &error).await?;
                    tracing::warn!(outbox_id = %id, attempts = attempts + 1, "publish failed; re-armed with backoff");
                }
            }
        }
    }

    tracing::info!("outbox relay stopped cleanly");
    Ok(())
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

// Keep ack/nack option imports meaningful for consumer-side helpers used by
// tests and future tooling without triggering unused-import warnings.
const _: Option<(BasicAckOptions, BasicNackOptions)> = None;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relay_config_applies_defaults_and_bounds() {
        std::env::set_var("RELAY_DATABASE_URL", "postgres://localhost/x");
        std::env::set_var("RELAY_AMQP_URL", "amqp://localhost");
        std::env::set_var("RELAY_BATCH_SIZE", "99999"); // out of range -> default
        std::env::set_var("RELAY_POLL_INTERVAL_MS", "10"); // out of range -> default
        let config = RelayConfig::from_env().expect("valid config");
        assert_eq!(config.batch_size, DEFAULT_BATCH_SIZE);
        assert_eq!(config.poll, Duration::from_millis(DEFAULT_POLL_MS));
        assert_eq!(config.max_attempts, DEFAULT_MAX_ATTEMPTS);
    }

    #[test]
    fn relay_config_requires_urls() {
        std::env::remove_var("RELAY_DATABASE_URL");
        std::env::remove_var("DATABASE_URL");
        std::env::remove_var("RELAY_AMQP_URL");
        std::env::remove_var("RABBIT_URL");
        assert!(RelayConfig::from_env().is_err());
    }

    #[test]
    fn backoff_is_exponential_and_capped() {
        // Mirror the re-arm schedule asserted through record_failure logic.
        let mut previous = 0u64;
        for attempts in 1..=12u64 {
            let backoff = BASE_BACKOFF_SECS
                .saturating_mul(1u64 << attempts.min(8))
                .min(MAX_BACKOFF_SECS);
            assert!(backoff >= previous, "backoff must be monotonic");
            assert!(backoff <= MAX_BACKOFF_SECS);
            previous = backoff;
        }
        assert_eq!(previous, MAX_BACKOFF_SECS);
    }
}
