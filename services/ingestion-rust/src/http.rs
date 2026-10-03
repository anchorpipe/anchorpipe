use crate::{
    auth::{HmacV1Verifier, VerificationInput},
    config::Config,
    dto::IngestionEnvelopeV1,
    error::ApiError,
    ports::{DurableIngestionPort, EnqueueReceipt},
};
use async_trait::async_trait;
use axum::{
    extract::{FromRequest, Request, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use http_body_util::{BodyExt, Limited};
use serde::Serialize;
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[derive(Clone, Copy)]
pub struct BodyPolicy {
    pub max_bytes: usize,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub verifier: HmacV1Verifier,
    pub durable: Arc<dyn DurableIngestionPort>,
}

impl AppState {
    pub fn new(config: Config, durable: Arc<dyn DurableIngestionPort>) -> Self {
        let verifier =
            HmacV1Verifier::new(config.hmac_secret.clone(), config.max_clock_skew_seconds);
        Self {
            config,
            verifier,
            durable,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
}

pub struct LimitedBody(pub Vec<u8>);

#[async_trait]
impl FromRequest<AppState> for LimitedBody {
    type Rejection = ApiError;
    async fn from_request(req: Request, _state: &AppState) -> Result<Self, Self::Rejection> {
        let policy = req
            .extensions()
            .get::<BodyPolicy>()
            .copied()
            .ok_or(ApiError::Internal)?;
        let body = Limited::new(req.into_body(), policy.max_bytes.saturating_add(1))
            .collect()
            .await
            .map_err(|_| ApiError::BodyTooLarge)?
            .to_bytes();
        if body.len() > policy.max_bytes {
            return Err(ApiError::BodyTooLarge);
        }
        Ok(Self(body.to_vec()))
    }
}

pub fn router(state: AppState) -> Router {
    let policy = BodyPolicy {
        max_bytes: state.config.max_body_bytes,
    };
    Router::new()
        .route("/healthz", get(health))
        .route("/readyz", get(readiness))
        .route("/v1/ingest", post(ingest))
        .layer(axum::Extension(policy))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { status: "ok" }))
}

async fn readiness(State(state): State<AppState>) -> Result<impl IntoResponse, ApiError> {
    state
        .durable
        .readiness()
        .await
        .map_err(|_| ApiError::NotReady)?;
    Ok((StatusCode::OK, Json(HealthResponse { status: "ready" })))
}

async fn ingest(
    State(state): State<AppState>,
    headers: HeaderMap,
    LimitedBody(body): LimitedBody,
) -> Result<impl IntoResponse, ApiError> {
    let timestamp = header(&headers, "x-anchor-timestamp")?;
    let nonce = header(&headers, "x-anchor-nonce")?;
    let body_digest = header(&headers, "x-anchor-body-sha256")?;
    let signature = header(&headers, "x-anchor-signature")?;
    state
        .verifier
        .verify(&VerificationInput {
            timestamp,
            nonce,
            body_digest,
            signature,
            body: &body,
        })
        .map_err(ApiError::Authentication)?;
    let envelope: IngestionEnvelopeV1 =
        serde_json::from_slice(&body).map_err(|_| ApiError::InvalidJson)?;
    envelope.validate().map_err(ApiError::Validation)?;
    let receipt: EnqueueReceipt = state
        .durable
        .enqueue(&envelope)
        .await
        .map_err(ApiError::from)?;
    tracing::info!(event_id = %receipt.event_id, accepted = receipt.accepted, "ingestion accepted");
    Ok((StatusCode::ACCEPTED, Json(receipt)))
}

fn header<'a>(headers: &'a HeaderMap, name: &'static str) -> Result<&'a str, ApiError> {
    headers
        .get(name)
        .ok_or(ApiError::MissingHeader)?
        .to_str()
        .map_err(|_| ApiError::InvalidHeader)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        dto::EnvelopeVersion,
        ports::{PortError, UnavailablePort},
    };
    use serde_json::json;
    use std::sync::Arc;

    fn state(limit: usize) -> AppState {
        AppState::new(ConfigForTest::config(limit), Arc::new(UnavailablePort))
    }

    struct ConfigForTest;
    impl ConfigForTest {
        fn config(limit: usize) -> Config {
            Config {
                bind_addr: "127.0.0.1:0".parse().unwrap(),
                hmac_secret: vec![b'x'; 32],
                max_body_bytes: limit,
                max_clock_skew_seconds: 300,
                service_name: "test".into(),
            }
        }
    }

    #[tokio::test]
    async fn body_policy_rejects_over_limit() {
        let policy = BodyPolicy { max_bytes: 3 };
        let request = Request::builder()
            .body(axum::body::Body::from("1234"))
            .unwrap();
        let mut request = request;
        request.extensions_mut().insert(policy);
        assert!(matches!(
            LimitedBody::from_request(request, &state(3)).await,
            Err(ApiError::BodyTooLarge)
        ));
    }

    #[test]
    fn receipt_is_serializable() {
        let _ = serde_json::to_string(&EnqueueReceipt {
            accepted: true,
            event_id: "id".into(),
        })
        .unwrap();
        let _ = json!({"version": "v1"});
        let _ = EnvelopeVersion::V1;
        let _ = PortError::Failed;
    }
}
