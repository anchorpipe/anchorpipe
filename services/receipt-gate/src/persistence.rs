//! Durable Postgres intake adapter for the receipt gate.
//!
//! [`PostgresIntakePort`] implements [`DurableIngestionPort`] against the
//! canonical Prisma-managed schema (`tenants`, `repos`, `ingestion_receipts`,
//! `outbox_events`). The write path is a single transaction:
//!
//! 1. resolve (or lazily provision) the tenant and repository rows;
//! 2. insert the idempotent ingestion receipt keyed by `(tenant_id, client_key)`
//!    with `ON CONFLICT DO NOTHING` and read-or-create semantics;
//! 3. insert the versioned `ingestion.received` outbox event in the same
//!    transaction so the relay can publish it exactly-once-at-least downstream.
//!
//! Evidence bytes stay on the request path (object storage is wired through
//! `evidence.rs`); this module owns only the durable metadata plane.

use crate::dto::IngestionEnvelopeV1;
use anchorpipe_pipeline_contracts::CanonicalRunPayload;
use crate::ports::{DurableIngestionPort, EnqueueReceipt, PortError};
use async_trait::async_trait;
use sha2::Digest;
use sqlx::postgres::{PgPool, PgPoolOptions};
use sqlx::Row;
use std::time::Duration;

/// Deterministic UUIDv5 (RFC 9562) used to derive stable row ids from natural
/// keys such as `tenant:<slug>` or `repo:<tenant>|<owner>/<name>`. Reusing the
/// same namespace keeps receipts, tenants, and repos joinable across restarts
/// without a sequence or race.
const NATURAL_KEY_NAMESPACE: uuid::Uuid = uuid::uuid!("6ba7b812-6dad-11d1-80b4-00c04fd430c8");

fn natural_key_id(seed: &str) -> String {
    let mut hasher = sha1::Sha1::new();
    hasher.update(NATURAL_KEY_NAMESPACE.as_bytes());
    hasher.update(seed.as_bytes());
    let digest = hasher.finalize();
    let mut bytes = [0u8; 16];
    bytes.copy_from_slice(&digest[..16]);
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    uuid::Uuid::from_bytes(bytes).to_string()
}

#[derive(Debug, Clone)]
pub struct IntakeDbConfig {
    pub database_url: String,
    pub max_connections: u32,
    pub acquire_timeout_secs: u64,
}

impl IntakeDbConfig {
    pub fn from_env() -> Result<Self, PortError> {
        let database_url = std::env::var("INGESTION_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .map_err(|_| PortError::Unavailable)?;
        let max_connections = std::env::var("INGESTION_DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(8);
        let acquire_timeout_secs = std::env::var("INGESTION_DB_ACQUIRE_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);
        Ok(Self {
            database_url,
            max_connections,
            acquire_timeout_secs,
        })
    }
}

/// Durable intake port backed by the shared Postgres control-plane schema.
pub struct PostgresIntakePort {
    pool: PgPool,
}

impl PostgresIntakePort {
    pub async fn connect(config: IntakeDbConfig) -> Result<Self, PortError> {
        let pool = PgPoolOptions::new()
            .max_connections(config.max_connections)
            .acquire_timeout(Duration::from_secs(config.acquire_timeout_secs))
            .connect(&config.database_url)
            .await
            .map_err(|_| PortError::Failed)?;
        Ok(Self { pool })
    }

    #[cfg(test)]
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Resolve a tenant by slug. The control plane owns tenant lifecycle; the
    /// gate provisions deterministically on first intake so a correctly signed
    /// request never fails purely because a row has not been pre-seeded.
    async fn ensure_tenant(&self, tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, slug: &str) -> Result<String, PortError> {
        if let Some(row) = sqlx::query("SELECT id FROM tenants WHERE slug = $1")
            .bind(slug)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|_| PortError::Failed)?
        {
            return Ok(row.get("id"));
        }
        let id = natural_key_id(&format!("tenant:{slug}"));
        sqlx::query(
            "INSERT INTO tenants (id, slug, name, created_at)
             VALUES ($1, $2, $2, now())
             ON CONFLICT (slug) DO NOTHING",
        )
        .bind(&id)
        .bind(slug)
        .execute(&mut **tx)
        .await
        .map_err(|_| PortError::Failed)?;
        Ok(id)
    }

    async fn ensure_repo(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        tenant_id: &str,
        owner: &str,
        name: &str,
    ) -> Result<String, PortError> {
        let id = natural_key_id(&format!("repo:{tenant_id}|{owner}/{name}"));
        if let Some(row) = sqlx::query("SELECT id FROM repos WHERE tenant_id = $1 AND owner = $2 AND name = $3")
            .bind(tenant_id)
            .bind(owner)
            .bind(name)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|_| PortError::Failed)?
        {
            return Ok(row.get("id"));
        }
        sqlx::query(
            "INSERT INTO repos (id, tenant_id, name, owner, default_branch, visibility, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'main', 'private', now(), now())
             ON CONFLICT (id) DO NOTHING",
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(name)
        .bind(owner)
        .execute(&mut **tx)
        .await
        .map_err(|_| PortError::Failed)?;
        Ok(id)
    }

    /// Extract `(owner, name)` from a repository identifier. Accepts
    /// `owner/name`, full URLs, or falls back to a synthetic owner.
    fn parse_repo(repository_id: &str) -> (String, String) {
        let cleaned = repository_id
            .trim_start_matches("https://")
            .trim_start_matches("http://")
            .trim_start_matches("github.com/")
            .trim_end_matches('/');
        let mut parts = cleaned.split('/').filter(|p| !p.is_empty());
        match (parts.next(), parts.next()) {
            (Some(owner), Some(name)) => (owner.to_string(), name.to_string()),
            (Some(name), None) => ("unknown".to_string(), name.to_string()),
            _ => ("unknown".to_string(), "unknown".to_string()),
        }
    }

    fn payload_text(payload: &serde_json::Value, key: &str) -> Option<String> {
        payload.get(key).and_then(|v| v.as_str()).map(str::to_string)
    }

    async fn persist(
        &self,
        envelope: &IngestionEnvelopeV1,
        raw: &[u8],
    ) -> Result<EnqueueReceipt, PortError> {
        let repository_id = Self::payload_text(&envelope.payload, "repository_id")
            .ok_or(PortError::Failed)?;
        let commit_sha = Self::payload_text(&envelope.payload, "commit_sha")
            .filter(is_hex_sha)
            .ok_or(PortError::Failed)?;
        let framework = Self::payload_text(&envelope.payload, "framework")
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| "unknown".to_string());
        let provider_run_id = Self::payload_text(&envelope.payload, "run_id");
        let observed_ref = Self::payload_text(&envelope.payload, "ref");
        let (owner, name) = Self::parse_repo(&repository_id);

        let client_key = format!("{}:{}", envelope.event_type, envelope.event_id);
        let request_hash = sha256_hex(raw);
        let object_key = format!(
            "tenants/{}/receipts/{}.json",
            envelope.tenant_id, envelope.event_id
        );

        let mut tx = self.pool.begin().await.map_err(|_| PortError::Failed)?;

        let tenant_id = self.ensure_tenant(&mut tx, &envelope.tenant_id).await?;
        let repo_id = self.ensure_repo(&mut tx, &tenant_id, &owner, &name).await?;

        // Read-or-create the receipt. A duplicate delivery returns the
        // original row instead of failing the caller.
        let existing = sqlx::query(
            "SELECT id FROM ingestion_receipts WHERE tenant_id = $1 AND client_key = $2",
        )
        .bind(&tenant_id)
        .bind(&client_key)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|_| PortError::Failed)?;

        let receipt_id: String = match existing {
            Some(row) => row.get("id"),
            None => {
                let id = natural_key_id(&format!("receipt:{client_key}"));
                // Normalize any RFC3339 offset (e.g. "+05:30") to UTC before binding.
                let occurred_at = chrono::DateTime::parse_from_rfc3339(&envelope.occurred_at)
                    .map_err(|_| PortError::Failed)?
                    .with_timezone(&chrono::Utc);
                let result = sqlx::query(
                    "INSERT INTO ingestion_receipts (
                        id, tenant_id, repo_id, client_key, request_hash, event_id,
                        schema_version, source, media_type, size_bytes, object_key,
                        provider_run_id, commit_sha, observed_ref, framework, status,
                        occurred_at, received_at, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,'v1',$7,'application/json',$8,$9,$10,$11,$12,$13,
                             'accepted',$14, now(), now())
                     ON CONFLICT (tenant_id, client_key) DO NOTHING",
                )
                .bind(&id)
                .bind(&tenant_id)
                .bind(&repo_id)
                .bind(&client_key)
                .bind(&request_hash)
                .bind(&envelope.event_id)
                .bind(&repository_id)
                .bind(raw.len() as i32)
                .bind(&object_key)
                .bind(provider_run_id.clone())
                .bind(&commit_sha)
                .bind(observed_ref.clone())
                .bind(&framework)
                .bind(occurred_at)
                .execute(&mut **tx)
                .await
                .map_err(|_| PortError::Failed)?;
                if result.rows_affected() == 0 {
                    // Lost a race with a concurrent duplicate; re-read.
                    sqlx::query(
                        "SELECT id FROM ingestion_receipts WHERE tenant_id = $1 AND client_key = $2",
                    )
                    .bind(&tenant_id)
                    .bind(&client_key)
                    .fetch_one(&mut **tx)
                    .await
                    .map_err(|_| PortError::Failed)?
                    .get("id")
                } else {
                    id
                }
            }
        };

        // Transactional outbox write; the relay publishes this row later.
        let outbox_payload = serde_json::json!({
            "schema_version": 1,
            "message_type": envelope.event_type,
            "event_id": envelope.event_id,
            "tenant_id": envelope.tenant_id,
            "receipt_id": receipt_id,
            "occurred_at": envelope.occurred_at,
            "payload": envelope.payload,
        });
        sqlx::query(
            "INSERT INTO outbox_events (id, tenant_id, receipt_id, event_type, event_version,
                                         payload, status, available_at, attempts, created_at)
             VALUES ($1,$2,$3,$4,1,$5,'pending',now(),0,now())
             ON CONFLICT (tenant_id, receipt_id, event_type) DO NOTHING",
        )
        .bind(natural_key_id(&format!(
            "outbox:{tenant_id}:{receipt_id}:{}",
            envelope.event_type
        )))
        .bind(&tenant_id)
        .bind(&receipt_id)
        .bind(&envelope.event_type)
        .bind(&outbox_payload)
        .execute(&mut **tx)
        .await
        .map_err(|_| PortError::Failed)?;

        tx.commit().await.map_err(|_| PortError::Failed)?;

        Ok(EnqueueReceipt {
            accepted: true,
            event_id: envelope.event_id.clone(),
        })
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(sha2::Sha256::digest(bytes))
}

/// A commit SHA must be 7..=64 lowercase hex characters.
fn is_hex_sha(value: &str) -> bool {
    (7..=64).contains(&value.len()) && value.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
}

#[async_trait]
impl DurableIngestionPort for PostgresIntakePort {
    async fn enqueue(&self, envelope: &IngestionEnvelopeV1) -> Result<EnqueueReceipt, PortError> {
        // Enforce the shared run-payload contract before touching the database:
        // unknown fields are rejected and limits come from pipeline-contracts.
        let payload_json = serde_json::to_string(&envelope.payload).map_err(|_| PortError::Failed)?;
        anchorpipe_pipeline_contracts::from_json_strict::<CanonicalRunPayload>(&payload_json)
            .map_err(|_| PortError::Failed)?;
        // The HTTP layer validated the envelope already; re-serialize to get
        // the canonical byte form used for the request hash.
        let raw = serde_json::to_vec(envelope).map_err(|_| PortError::Failed)?;
        self.persist(envelope, &raw).await
    }

    async fn readiness(&self) -> Result<(), PortError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(|_| PortError::Unavailable)
    }
}
