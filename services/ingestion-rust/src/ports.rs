use crate::dto::IngestionEnvelopeV1;
use async_trait::async_trait;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct EnqueueReceipt {
    pub accepted: bool,
    pub event_id: String,
}

#[derive(Debug, thiserror::Error, Clone, PartialEq, Eq)]
pub enum PortError {
    #[error("durable ingestion adapter unavailable")]
    Unavailable,
    #[error("durable ingestion adapter failed")]
    Failed,
}

#[async_trait]
pub trait DurableIngestionPort: Send + Sync {
    async fn enqueue(&self, envelope: &IngestionEnvelopeV1) -> Result<EnqueueReceipt, PortError>;
    async fn readiness(&self) -> Result<(), PortError>;
}

/// Explicit fail-closed adapter used by the binary until a durable adapter is wired.
/// It never stores data and therefore cannot be mistaken for persistence.
pub struct UnavailablePort;

#[async_trait]
impl DurableIngestionPort for UnavailablePort {
    async fn enqueue(&self, _envelope: &IngestionEnvelopeV1) -> Result<EnqueueReceipt, PortError> {
        Err(PortError::Unavailable)
    }
    async fn readiness(&self) -> Result<(), PortError> {
        Err(PortError::Unavailable)
    }
}
