//! Authenticated ingestion HTTP service.
//!
//! The HTTP layer deliberately depends on a [`DurableIngestionPort`] rather than
//! implementing persistence. A real deployment must provide that adapter.

mod auth;
mod config;
mod dto;
mod error;
mod http;
mod ports;

pub use auth::{body_digest_hex, canonical_string, AuthError, HmacV1Verifier, VerificationInput};
pub use config::{Config, ConfigError};
pub use dto::{EnvelopeVersion, IngestionEnvelopeV1, ValidationError};
pub use error::{ApiError, ErrorCode, ErrorResponse};
pub use http::{router, AppState, BodyPolicy, HealthResponse};
pub use ports::{DurableIngestionPort, EnqueueReceipt, PortError, UnavailablePort};
