use crate::{auth::AuthError, dto::ValidationError, ports::PortError};
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    BodyTooLarge,
    InvalidJson,
    MissingHeader,
    InvalidHeader,
    AuthenticationFailed,
    ValidationFailed,
    DurableUnavailable,
    NotReady,
    Internal,
}

impl ErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::BodyTooLarge => "BODY_TOO_LARGE",
            Self::InvalidJson => "INVALID_JSON",
            Self::MissingHeader => "MISSING_HEADER",
            Self::InvalidHeader => "INVALID_HEADER",
            Self::AuthenticationFailed => "AUTHENTICATION_FAILED",
            Self::ValidationFailed => "VALIDATION_FAILED",
            Self::DurableUnavailable => "DURABLE_INGESTION_UNAVAILABLE",
            Self::NotReady => "NOT_READY",
            Self::Internal => "INTERNAL_ERROR",
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ErrorResponse {
    pub error: ErrorDetails,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("request body exceeds configured limit")]
    BodyTooLarge,
    #[error("request body is not valid JSON")]
    InvalidJson,
    #[error("required authentication header is missing")]
    MissingHeader,
    #[error("authentication header is invalid")]
    InvalidHeader,
    #[error("request authentication failed")]
    Authentication(#[from] AuthError),
    #[error("ingestion envelope validation failed")]
    Validation(#[from] ValidationError),
    #[error("durable ingestion adapter is unavailable")]
    DurableUnavailable,
    #[error("durable ingestion adapter is not ready")]
    NotReady,
    #[error("internal server error")]
    Internal,
}

impl ApiError {
    pub fn code(&self) -> ErrorCode {
        match self {
            Self::BodyTooLarge => ErrorCode::BodyTooLarge,
            Self::InvalidJson => ErrorCode::InvalidJson,
            Self::MissingHeader => ErrorCode::MissingHeader,
            Self::InvalidHeader => ErrorCode::InvalidHeader,
            Self::Authentication(_) => ErrorCode::AuthenticationFailed,
            Self::Validation(_) => ErrorCode::ValidationFailed,
            Self::DurableUnavailable => ErrorCode::DurableUnavailable,
            Self::NotReady => ErrorCode::NotReady,
            Self::Internal => ErrorCode::Internal,
        }
    }
    pub fn status(&self) -> StatusCode {
        match self {
            Self::BodyTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::InvalidJson
            | Self::MissingHeader
            | Self::InvalidHeader
            | Self::Authentication(_)
            | Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::DurableUnavailable | Self::NotReady => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
    fn public_message(&self) -> String {
        match self {
            Self::Validation(e) => e.code.to_string(),
            _ => self.to_string(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let code = self.code();
        let body = ErrorResponse {
            error: ErrorDetails {
                code: code.as_str().to_string(),
                message: self.public_message(),
            },
        };
        (self.status(), Json(body)).into_response()
    }
}

impl From<PortError> for ApiError {
    fn from(error: PortError) -> Self {
        tracing::error!(error = %error, "durable ingestion adapter error");
        Self::DurableUnavailable
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn maps_errors_to_stable_codes_and_statuses() {
        assert_eq!(ApiError::BodyTooLarge.code().as_str(), "BODY_TOO_LARGE");
        assert_eq!(
            ApiError::BodyTooLarge.status(),
            StatusCode::PAYLOAD_TOO_LARGE
        );
        assert_eq!(ApiError::NotReady.status(), StatusCode::SERVICE_UNAVAILABLE);
        let validation = ValidationError {
            code: "ENVELOPE_EVENT_ID_INVALID",
            message: "secret detail".into(),
        };
        assert_eq!(
            ApiError::Validation(validation).code().as_str(),
            "VALIDATION_FAILED"
        );
    }
}
