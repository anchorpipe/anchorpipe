//! Shared wire contracts for Anchorpipe Rust services.
//!
//! The types in this crate are deliberately transport-oriented: JSON names are
//! stable snake_case, timestamps are UTC, and validation is explicit rather
//! than being hidden in constructors.  Call [`from_json`] at a service
//! boundary, choosing [`UnknownFieldPolicy::Reject`] for strict consumers or
//! [`UnknownFieldPolicy::Ignore`] when rolling out a forward-compatible reader.

use chrono::{DateTime, Utc};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, fmt};

/// Limits applied by the shared validators.  They are intentionally modest so
/// a service can safely use these contracts at a queue or HTTP boundary.
pub mod limits {
    pub const MAX_STRING_CHARS: usize = 4_096;
    pub const MAX_ID_CHARS: usize = 256;
    pub const MAX_PAYLOAD_BYTES: usize = 1_048_576;
    pub const MAX_JSON_DEPTH: usize = 32;
    pub const MAX_TEST_CASES: usize = 10_000;
    pub const MAX_WARNINGS: usize = 10_000;
    pub const MAX_TAGS: usize = 128;
    pub const MAX_METADATA_ENTRIES: usize = 128;
    pub const MAX_DEPENDENCIES: usize = 64;
}

/// Unknown JSON fields can be rejected during a migration or ignored by a
/// reader that explicitly supports additive fields from newer producers.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UnknownFieldPolicy {
    Reject,
    Ignore,
}

/// A structured validation failure.  `field` is a stable-ish JSON path useful
/// to API clients, while `message` is intended for operators and tests.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

impl ValidationError {
    fn new(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            message: message.into(),
        }
    }
}

/// Errors returned by boundary JSON decoding and validation helpers.
#[derive(Debug)]
pub enum ContractError {
    Json(serde_json::Error),
    UnknownFields(Vec<String>),
    Validation(Vec<ValidationError>),
}

impl fmt::Display for ContractError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Json(error) => write!(f, "invalid contract JSON: {error}"),
            Self::UnknownFields(fields) => {
                write!(f, "unknown contract fields: {}", fields.join(", "))
            }
            Self::Validation(errors) => {
                write!(f, "contract validation failed")?;
                for error in errors {
                    write!(f, "; {}: {}", error.field, error.message)?;
                }
                Ok(())
            }
        }
    }
}

impl std::error::Error for ContractError {}

impl From<serde_json::Error> for ContractError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

/// Types that can be checked after deserialization.
pub trait Validate {
    fn validate(&self) -> Result<(), Vec<ValidationError>>;
}

/// Decode and validate a contract according to an explicit unknown-field policy.
pub fn from_json<T>(input: &str, policy: UnknownFieldPolicy) -> Result<T, ContractError>
where
    T: DeserializeOwned + Validate,
{
    let mut deserializer = serde_json::Deserializer::from_str(input);
    let mut ignored = Vec::new();
    let value: T =
        serde_ignored::deserialize(&mut deserializer, |path| ignored.push(path.to_string()))?;
    deserializer.end()?;
    if policy == UnknownFieldPolicy::Reject && !ignored.is_empty() {
        return Err(ContractError::UnknownFields(ignored));
    }
    value.validate().map_err(ContractError::Validation)?;
    Ok(value)
}

/// Strict JSON decoding, suitable for an ingress boundary.
pub fn from_json_strict<T>(input: &str) -> Result<T, ContractError>
where
    T: DeserializeOwned + Validate,
{
    from_json(input, UnknownFieldPolicy::Reject)
}

/// Additive-field-compatible JSON decoding, suitable for an older consumer
/// during a producer rollout.
pub fn from_json_forward_compatible<T>(input: &str) -> Result<T, ContractError>
where
    T: DeserializeOwned + Validate,
{
    from_json(input, UnknownFieldPolicy::Ignore)
}

fn validate_string(field: &str, value: &str, max: usize, errors: &mut Vec<ValidationError>) {
    if value.is_empty() {
        errors.push(ValidationError::new(field, "must not be empty"));
    } else if value.chars().count() > max {
        errors.push(ValidationError::new(
            field,
            format!("must be at most {max} characters"),
        ));
    }
}

fn validate_id(field: &str, value: &str, errors: &mut Vec<ValidationError>) {
    validate_string(field, value, limits::MAX_ID_CHARS, errors);
}

fn validate_optional_string(
    field: &str,
    value: Option<&str>,
    max: usize,
    errors: &mut Vec<ValidationError>,
) {
    if let Some(value) = value {
        validate_string(field, value, max, errors);
    }
}

fn validate_collection(field: &str, len: usize, max: usize, errors: &mut Vec<ValidationError>) {
    if len > max {
        errors.push(ValidationError::new(
            field,
            format!("must contain at most {max} items"),
        ));
    }
}

fn json_depth(value: &Value) -> usize {
    match value {
        Value::Array(values) => 1 + values.iter().map(json_depth).max().unwrap_or(0),
        Value::Object(values) => 1 + values.values().map(json_depth).max().unwrap_or(0),
        _ => 0,
    }
}

fn validate_json(field: &str, value: &Value, errors: &mut Vec<ValidationError>) {
    match serde_json::to_vec(value) {
        Ok(bytes) if bytes.len() > limits::MAX_PAYLOAD_BYTES => errors.push(ValidationError::new(
            field,
            format!("must be at most {} bytes", limits::MAX_PAYLOAD_BYTES),
        )),
        Err(_) => errors.push(ValidationError::new(field, "must be valid JSON")),
        _ => {}
    }
    if json_depth(value) > limits::MAX_JSON_DEPTH {
        errors.push(ValidationError::new(
            field,
            format!("must be at most {} levels deep", limits::MAX_JSON_DEPTH),
        ));
    }
}

fn append_prefixed(errors: &mut Vec<ValidationError>, prefix: &str, nested: Vec<ValidationError>) {
    errors.extend(nested.into_iter().map(|mut error| {
        error.field = format!("{prefix}.{}", error.field);
        error
    }));
}

/// The normalized test-run payload shared across pipeline services. Producers
/// embed this object in an envelope/outbox `payload`; consumers decode it with
/// [`from_json`] so field naming and limits stay contract-enforced on both
/// sides of the queue boundary.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct CanonicalRunPayload {
    pub repository_id: String,
    pub commit_sha: String,
    #[serde(default)]
    pub framework: Option<String>,
    #[serde(default)]
    pub run_id: Option<String>,
    #[serde(default)]
    pub ref_name: Option<String>,
    #[serde(default)]
    pub observed_ref: Option<String>,
    #[serde(default)]
    pub environment_hash: Option<String>,
    /// Raw provider records; shape is provider-specific until the
    /// canonicalizer maps them into canonical test cases.
    pub tests: Vec<Value>,
}

impl Validate for CanonicalRunPayload {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_id("repository_id", &self.repository_id, &mut errors);
        validate_string("commit_sha", &self.commit_sha, 64, &mut errors);
        validate_optional_string("framework", self.framework.as_deref(), 64, &mut errors);
        validate_optional_string("run_id", self.run_id.as_deref(), limits::MAX_ID_CHARS, &mut errors);
        validate_collection("tests", self.tests.len(), limits::MAX_TEST_CASES, &mut errors);
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Queue names shared by the relay, canonicalizer, and control plane. These
/// are wire-stable identifiers; renaming one requires a coordinated migration.
pub mod queues {
    pub const INGESTION_MAIN: &str = "test.ingestion";
    pub const INGESTION_DLQ: &str = "test.ingestion.failed";
    pub const DEAD_LETTER_EXCHANGE: &str = "dlx";
}

/// Metadata carried by every message.  IDs are opaque strings to support UUID,
/// cuid, and provider identifiers without making a wire-level identity claim.
#[derive(Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct MessageMetadata {
    pub message_id: String,
    pub tenant_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub causation_id: Option<String>,
    #[serde(default)]
    pub idempotency_key: Option<String>,
    pub producer: String,
    pub sent_at: DateTime<Utc>,
}

impl fmt::Debug for MessageMetadata {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("MessageMetadata")
            .field("message_id", &self.message_id)
            .field("tenant_id", &self.tenant_id)
            .field("correlation_id", &self.correlation_id)
            .field("causation_id", &self.causation_id)
            .field(
                "idempotency_key",
                &self.idempotency_key.as_ref().map(|_| "<redacted>"),
            )
            .field("producer", &self.producer)
            .field("sent_at", &self.sent_at)
            .finish()
    }
}

impl Validate for MessageMetadata {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_id("message_id", &self.message_id, &mut errors);
        validate_id("tenant_id", &self.tenant_id, &mut errors);
        for (field, value) in [
            ("correlation_id", self.correlation_id.as_deref()),
            ("causation_id", self.causation_id.as_deref()),
            ("idempotency_key", self.idempotency_key.as_deref()),
        ] {
            validate_optional_string(field, value, limits::MAX_ID_CHARS, &mut errors);
        }
        validate_string(
            "producer",
            &self.producer,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if self.sent_at.timestamp_nanos_opt().is_none() {
            errors.push(ValidationError::new(
                "sent_at",
                "must be a valid UTC timestamp",
            ));
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// The producer identity and source facts needed to interpret an envelope.
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct IngestionSource {
    pub provider: String,
    pub framework: String,
    pub repository_id: String,
    #[serde(default)]
    pub commit_sha: Option<String>,
}

impl Validate for IngestionSource {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_string(
            "provider",
            &self.provider,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_string(
            "framework",
            &self.framework,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_id("repository_id", &self.repository_id, &mut errors);
        validate_optional_string(
            "commit_sha",
            self.commit_sha.as_deref(),
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Versioned input crossing into ingestion/normalization.
#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct IngestionEnvelope {
    pub schema_version: u16,
    pub message_type: String,
    pub metadata: MessageMetadata,
    pub source: IngestionSource,
    pub payload: Value,
}

impl fmt::Debug for IngestionEnvelope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("IngestionEnvelope")
            .field("schema_version", &self.schema_version)
            .field("message_type", &self.message_type)
            .field("metadata", &self.metadata)
            .field("source", &self.source)
            .field("payload", &"<redacted>")
            .finish()
    }
}

impl Validate for IngestionEnvelope {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        if self.schema_version == 0 {
            errors.push(ValidationError::new(
                "schema_version",
                "must be greater than zero",
            ));
        }
        validate_string(
            "message_type",
            &self.message_type,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if let Err(nested) = self.metadata.validate() {
            append_prefixed(&mut errors, "metadata", nested);
        }
        if let Err(nested) = self.source.validate() {
            append_prefixed(&mut errors, "source", nested);
        }
        validate_json("payload", &self.payload, &mut errors);
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Canonical status shared by normalizers and downstream consumers.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CanonicalTestStatus {
    Pass,
    Fail,
    Skip,
    Error,
    Unknown,
}

/// Source/provenance facts retained alongside canonical test facts.
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct TestCaseProvenance {
    pub source_framework: String,
    pub source_index: u32,
    #[serde(default)]
    pub parser_version: Option<String>,
}

impl Validate for TestCaseProvenance {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_string(
            "source_framework",
            &self.source_framework,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_optional_string(
            "parser_version",
            self.parser_version.as_deref(),
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// A normalized, deterministic test case.  `raw` is retained for evidence but
/// is intentionally omitted from Debug output.
#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct CanonicalTestCase {
    pub path: String,
    pub name: String,
    pub framework: String,
    pub status: CanonicalTestStatus,
    #[serde(default)]
    pub duration_ms: Option<u64>,
    #[serde(default)]
    pub started_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub failure_details: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub metadata: BTreeMap<String, Value>,
    pub raw: Value,
    pub provenance: TestCaseProvenance,
}

impl fmt::Debug for CanonicalTestCase {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CanonicalTestCase")
            .field("path", &self.path)
            .field("name", &self.name)
            .field("framework", &self.framework)
            .field("status", &self.status)
            .field("duration_ms", &self.duration_ms)
            .field("started_at", &self.started_at)
            .field(
                "failure_details",
                &self.failure_details.as_ref().map(|_| "<redacted>"),
            )
            .field("tags", &self.tags)
            .field("metadata", &"<redacted>")
            .field("raw", &"<redacted>")
            .field("provenance", &self.provenance)
            .finish()
    }
}

impl Validate for CanonicalTestCase {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_string("path", &self.path, limits::MAX_STRING_CHARS, &mut errors);
        validate_string("name", &self.name, limits::MAX_STRING_CHARS, &mut errors);
        validate_string(
            "framework",
            &self.framework,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if let Some(value) = self.duration_ms {
            if value > 86_400_000 {
                errors.push(ValidationError::new(
                    "duration_ms",
                    "must be at most 86400000",
                ));
            }
        }
        if let Some(value) = self.started_at {
            if value.timestamp_nanos_opt().is_none() {
                errors.push(ValidationError::new(
                    "started_at",
                    "must be a valid UTC timestamp",
                ));
            }
        }
        validate_optional_string(
            "failure_details",
            self.failure_details.as_deref(),
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_collection("tags", self.tags.len(), limits::MAX_TAGS, &mut errors);
        for (index, tag) in self.tags.iter().enumerate() {
            validate_string(
                &format!("tags[{index}]"),
                tag,
                limits::MAX_STRING_CHARS,
                &mut errors,
            );
        }
        validate_collection(
            "metadata",
            self.metadata.len(),
            limits::MAX_METADATA_ENTRIES,
            &mut errors,
        );
        for (key, value) in &self.metadata {
            validate_string("metadata key", key, limits::MAX_STRING_CHARS, &mut errors);
            validate_json(&format!("metadata.{key}"), value, &mut errors);
        }
        validate_json("raw", &self.raw, &mut errors);
        if let Err(nested) = self.provenance.validate() {
            append_prefixed(&mut errors, "provenance", nested);
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Warning emitted when normalization had to retain or infer imperfect input.
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct NormalizationWarning {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub field: Option<String>,
    #[serde(default)]
    pub source_index: Option<u32>,
}

impl Validate for NormalizationWarning {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_string("code", &self.code, limits::MAX_ID_CHARS, &mut errors);
        validate_string(
            "message",
            &self.message,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_optional_string(
            "field",
            self.field.as_deref(),
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Event emitted after an outbox transaction is durable.
#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct OutboxEvent {
    pub event_id: String,
    pub event_type: String,
    pub event_version: u16,
    pub tenant_id: String,
    pub aggregate_id: String,
    pub metadata: MessageMetadata,
    pub payload: Value,
    pub occurred_at: DateTime<Utc>,
}

impl fmt::Debug for OutboxEvent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("OutboxEvent")
            .field("event_id", &self.event_id)
            .field("event_type", &self.event_type)
            .field("event_version", &self.event_version)
            .field("tenant_id", &self.tenant_id)
            .field("aggregate_id", &self.aggregate_id)
            .field("metadata", &self.metadata)
            .field("payload", &"<redacted>")
            .field("occurred_at", &self.occurred_at)
            .finish()
    }
}

impl Validate for OutboxEvent {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_id("event_id", &self.event_id, &mut errors);
        validate_string(
            "event_type",
            &self.event_type,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if self.event_version == 0 {
            errors.push(ValidationError::new(
                "event_version",
                "must be greater than zero",
            ));
        }
        validate_id("tenant_id", &self.tenant_id, &mut errors);
        validate_id("aggregate_id", &self.aggregate_id, &mut errors);
        if let Err(nested) = self.metadata.validate() {
            append_prefixed(&mut errors, "metadata", nested);
        }
        validate_json("payload", &self.payload, &mut errors);
        if self.occurred_at.timestamp_nanos_opt().is_none() {
            errors.push(ValidationError::new(
                "occurred_at",
                "must be a valid UTC timestamp",
            ));
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Stable error code values.  This is a string newtype, rather than a closed
/// enum, so clients can preserve codes introduced by newer services.
#[derive(Clone, Serialize, Deserialize, Eq, PartialEq, Ord, PartialOrd, Hash)]
#[serde(transparent)]
pub struct ErrorCode(String);

impl ErrorCode {
    pub const INVALID_PAYLOAD: &'static str = "INVALID_PAYLOAD";
    pub const UNSUPPORTED_VERSION: &'static str = "UNSUPPORTED_VERSION";
    pub const UNAUTHORIZED: &'static str = "UNAUTHORIZED";
    pub const FORBIDDEN: &'static str = "FORBIDDEN";
    pub const NOT_FOUND: &'static str = "NOT_FOUND";
    pub const CONFLICT: &'static str = "CONFLICT";
    pub const RATE_LIMITED: &'static str = "RATE_LIMITED";
    pub const DEPENDENCY_UNAVAILABLE: &'static str = "DEPENDENCY_UNAVAILABLE";
    pub const INTERNAL: &'static str = "INTERNAL";
    pub const TIMEOUT: &'static str = "TIMEOUT";

    pub fn new(value: impl Into<String>) -> Result<Self, ValidationError> {
        let value = value.into();
        if value.is_empty() || value.chars().count() > limits::MAX_ID_CHARS {
            return Err(ValidationError::new(
                "error_code",
                "must be non-empty and bounded",
            ));
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_tuple("ErrorCode").field(&self.0).finish()
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

/// Individual dependency status reported by a health endpoint.
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct DependencyHealth {
    pub status: HealthStatus,
    #[serde(default)]
    pub latency_ms: Option<u64>,
    #[serde(default)]
    pub detail: Option<String>,
}

impl Validate for DependencyHealth {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_optional_string(
            "detail",
            self.detail.as_deref(),
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

/// Coarse health status intentionally stable across services.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// A machine-readable health response with no credentials or connection URLs.
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct HealthResponse {
    pub status: HealthStatus,
    pub service: String,
    pub version: String,
    pub checked_at: DateTime<Utc>,
    #[serde(default)]
    pub dependencies: BTreeMap<String, DependencyHealth>,
}

impl Validate for HealthResponse {
    fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        validate_string(
            "service",
            &self.service,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        validate_string(
            "version",
            &self.version,
            limits::MAX_STRING_CHARS,
            &mut errors,
        );
        if self.checked_at.timestamp_nanos_opt().is_none() {
            errors.push(ValidationError::new(
                "checked_at",
                "must be a valid UTC timestamp",
            ));
        }
        validate_collection(
            "dependencies",
            self.dependencies.len(),
            limits::MAX_DEPENDENCIES,
            &mut errors,
        );
        for (name, dependency) in &self.dependencies {
            validate_string(
                "dependency name",
                name,
                limits::MAX_STRING_CHARS,
                &mut errors,
            );
            if let Err(nested) = dependency.validate() {
                append_prefixed(&mut errors, &format!("dependencies.{name}"), nested);
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use serde_json::json;

    fn metadata() -> MessageMetadata {
        MessageMetadata {
            message_id: "msg-1".into(),
            tenant_id: "tenant-1".into(),
            correlation_id: Some("corr-1".into()),
            causation_id: None,
            idempotency_key: Some("secret-ish-idempotency-key".into()),
            producer: "tests".into(),
            sent_at: Utc.with_ymd_and_hms(2025, 1, 2, 3, 4, 5).unwrap(),
        }
    }

    fn envelope() -> IngestionEnvelope {
        IngestionEnvelope {
            schema_version: 1,
            message_type: "test_run.received".into(),
            metadata: metadata(),
            source: IngestionSource {
                provider: "github".into(),
                framework: "jest".into(),
                repository_id: "repo-1".into(),
                commit_sha: Some("abc123".into()),
            },
            payload: json!({"tests": [{"name": "works", "status": "pass"}]}),
        }
    }

    fn canonical() -> CanonicalTestCase {
        CanonicalTestCase {
            path: "src/example.test.ts".into(),
            name: "works".into(),
            framework: "jest".into(),
            status: CanonicalTestStatus::Pass,
            duration_ms: Some(12),
            started_at: Some(Utc.with_ymd_and_hms(2025, 1, 2, 3, 4, 5).unwrap()),
            failure_details: None,
            tags: vec!["unit".into()],
            metadata: BTreeMap::from([(String::from("suite"), json!("example"))]),
            raw: json!({"name": "works", "status": "passed"}),
            provenance: TestCaseProvenance {
                source_framework: "jest".into(),
                source_index: 0,
                parser_version: Some("parser-1".into()),
            },
        }
    }

    #[test]
    fn valid_envelope_decodes_strictly() {
        let encoded = serde_json::to_string(&envelope()).unwrap();
        let decoded: IngestionEnvelope = from_json_strict(&encoded).unwrap();
        assert_eq!(decoded, envelope());
    }

    #[test]
    fn invalid_required_and_version_fields_are_rejected() {
        let mut value = serde_json::to_value(envelope()).unwrap();
        value["schema_version"] = json!(0);
        value["message_type"] = json!("");
        let error = from_json_strict::<IngestionEnvelope>(&value.to_string()).unwrap_err();
        match error {
            ContractError::Validation(errors) => {
                assert!(errors.iter().any(|e| e.field == "schema_version"));
                assert!(errors.iter().any(|e| e.field == "message_type"));
            }
            other => panic!("unexpected error: {other}"),
        }
    }

    #[test]
    fn unknown_fields_are_rejected_or_ignored_by_policy() {
        let mut value = serde_json::to_value(envelope()).unwrap();
        value["producer_added"] = json!(true);
        assert!(matches!(
            from_json_strict::<IngestionEnvelope>(&value.to_string()),
            Err(ContractError::UnknownFields(fields)) if fields == vec!["producer_added"]
        ));
        let decoded: IngestionEnvelope = from_json_forward_compatible(&value.to_string()).unwrap();
        assert_eq!(decoded, envelope());
    }

    #[test]
    fn payload_size_and_depth_limits_are_enforced() {
        let mut oversized = envelope();
        oversized.payload = json!("x".repeat(limits::MAX_PAYLOAD_BYTES));
        assert!(oversized
            .validate()
            .unwrap_err()
            .iter()
            .any(|e| e.field == "payload"));

        let mut nested = json!(null);
        for _ in 0..(limits::MAX_JSON_DEPTH + 1) {
            nested = json!([nested]);
        }
        let mut deeply_nested = envelope();
        deeply_nested.payload = nested;
        assert!(deeply_nested
            .validate()
            .unwrap_err()
            .iter()
            .any(|e| e.field == "payload"));
    }

    #[test]
    fn canonical_case_validates_and_round_trips_stable_json() {
        let case = canonical();
        case.validate().unwrap();
        let first = serde_json::to_string(&case).unwrap();
        let second: CanonicalTestCase = from_json_strict(&first).unwrap();
        assert_eq!(serde_json::to_string(&second).unwrap(), first);
    }

    #[test]
    fn canonical_collection_limits_are_enforced() {
        let mut case = canonical();
        case.tags = (0..=limits::MAX_TAGS).map(|n| format!("tag-{n}")).collect();
        assert!(case
            .validate()
            .unwrap_err()
            .iter()
            .any(|e| e.field == "tags"));
        let mut warning = NormalizationWarning {
            code: "MISSING_FIELD".into(),
            message: "missing".into(),
            field: None,
            source_index: None,
        };
        warning.message = "x".repeat(limits::MAX_STRING_CHARS + 1);
        assert!(warning.validate().is_err());
    }

    #[test]
    fn warning_and_error_code_preserve_stable_json_strings() {
        let warning = NormalizationWarning {
            code: "UNKNOWN_STATUS".into(),
            message: "status was not recognized".into(),
            field: Some("status".into()),
            source_index: Some(3),
        };
        let encoded = serde_json::to_string(&warning).unwrap();
        assert_eq!(
            encoded,
            r#"{"code":"UNKNOWN_STATUS","message":"status was not recognized","field":"status","source_index":3}"#
        );
        assert_eq!(
            ErrorCode::new(ErrorCode::INVALID_PAYLOAD).unwrap().as_str(),
            "INVALID_PAYLOAD"
        );
        let code_json = serde_json::to_string(&ErrorCode::new("NEW_CODE").unwrap()).unwrap();
        assert_eq!(code_json, r#""NEW_CODE""#);
    }

    #[test]
    fn outbox_event_round_trips_and_debug_redacts_payload_and_idempotency_key() {
        let event = OutboxEvent {
            event_id: "event-1".into(),
            event_type: "test_case.normalized".into(),
            event_version: 1,
            tenant_id: "tenant-1".into(),
            aggregate_id: "receipt-1".into(),
            metadata: metadata(),
            payload: json!({"authorization": "Bearer secret", "case": canonical()}),
            occurred_at: Utc.with_ymd_and_hms(2025, 1, 2, 3, 4, 5).unwrap(),
        };
        let encoded = serde_json::to_string(&event).unwrap();
        let decoded: OutboxEvent = from_json_strict(&encoded).unwrap();
        assert_eq!(decoded, event);
        let debug = format!("{event:?}");
        assert!(!debug.contains("Bearer secret"));
        assert!(!debug.contains("secret-ish-idempotency-key"));
        assert!(debug.contains("<redacted>"));
    }

    #[test]
    fn health_response_validates_dependency_count() {
        let mut response = HealthResponse {
            status: HealthStatus::Healthy,
            service: "normalizer".into(),
            version: "1.0.0".into(),
            checked_at: Utc.with_ymd_and_hms(2025, 1, 2, 3, 4, 5).unwrap(),
            dependencies: BTreeMap::new(),
        };
        response.dependencies = (0..=limits::MAX_DEPENDENCIES)
            .map(|n| {
                (
                    format!("dep-{n}"),
                    DependencyHealth {
                        status: HealthStatus::Healthy,
                        latency_ms: Some(1),
                        detail: None,
                    },
                )
            })
            .collect();
        assert!(response
            .validate()
            .unwrap_err()
            .iter()
            .any(|e| e.field == "dependencies"));
    }

    #[test]
    fn malformed_json_is_reported_as_json_error() {
        let error = from_json_strict::<IngestionEnvelope>("not-json").unwrap_err();
        assert!(matches!(error, ContractError::Json(_)));
    }
}
