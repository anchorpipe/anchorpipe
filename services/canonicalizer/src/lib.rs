//! Canonical normalization for parser-shaped test-case records.
//!
//! The crate intentionally contains no RabbitMQ dependency. `MessageTransport` is the
//! narrow adapter boundary used by an ingestion service; an AMQP implementation can
//! acknowledge, retry, or dead-letter messages without coupling this domain logic to a
//! particular RabbitMQ client.

use anchorpipe_pipeline_contracts::limits;
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fmt;

pub const CONTRACT_VERSION: &str = "normalizer.v1";
pub const SUPPORTED_FRAMEWORKS: [&str; 6] =
    ["junit", "jest", "pytest", "playwright", "mocha", "vitest"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CanonicalStatus {
    Pass,
    Fail,
    Skip,
    Error,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CanonicalFramework {
    Junit,
    Jest,
    Pytest,
    Playwright,
    Mocha,
    Vitest,
    Unknown,
}

impl CanonicalFramework {
    fn from_source(source: &str) -> Self {
        match source.trim().to_ascii_lowercase().as_str() {
            "junit" => Self::Junit,
            "jest" => Self::Jest,
            "pytest" => Self::Pytest,
            "playwright" => Self::Playwright,
            "mocha" => Self::Mocha,
            "vitest" => Self::Vitest,
            _ => Self::Unknown,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InputMessage {
    pub schema_version: String,
    pub message_id: String,
    pub tenant_id: String,
    pub receipt_id: String,
    pub source_framework: String,
    pub records: Vec<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

impl InputMessage {
    pub fn new(
        message_id: impl Into<String>,
        tenant_id: impl Into<String>,
        receipt_id: impl Into<String>,
        source_framework: impl Into<String>,
        records: Vec<Value>,
    ) -> Self {
        Self {
            schema_version: CONTRACT_VERSION.to_owned(),
            message_id: message_id.into(),
            tenant_id: tenant_id.into(),
            receipt_id: receipt_id.into(),
            source_framework: source_framework.into(),
            records,
            metadata: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OutputMessage {
    pub schema_version: String,
    pub message_id: String,
    pub tenant_id: String,
    pub receipt_id: String,
    pub source_framework: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    pub result: NormalizationResult,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NormalizationResult {
    pub test_cases: Vec<CanonicalTestCase>,
    pub warnings: Vec<NormalizationWarning>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanonicalTestCase {
    pub path: String,
    pub name: String,
    pub status: CanonicalStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    /// The complete unmodified parsed record, including fields not understood here.
    pub raw: Value,
    pub provenance: TestCaseProvenance,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestCaseProvenance {
    pub source_framework: String,
    pub framework: CanonicalFramework,
    pub source_index: usize,
    pub raw: Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WarningCode {
    MalformedRecord,
    UnsupportedFramework,
    MissingField,
    InvalidField,
    UnknownStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NormalizationWarning {
    pub code: WarningCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

fn warning(
    code: WarningCode,
    message: impl Into<String>,
    source_index: Option<usize>,
    field: Option<&str>,
) -> NormalizationWarning {
    NormalizationWarning {
        code,
        message: message.into(),
        source_index,
        field: field.map(str::to_owned),
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SingleNormalization {
    pub test_case: CanonicalTestCase,
    pub warnings: Vec<NormalizationWarning>,
}

/// Normalize all parsed records. Every input position produces exactly one output case.
pub fn normalize_test_cases(framework: &str, records: &[Value]) -> NormalizationResult {
    let source_framework = framework.to_owned();
    let canonical_framework = CanonicalFramework::from_source(framework);
    let mut warnings = Vec::new();
    if canonical_framework == CanonicalFramework::Unknown {
        warnings.push(warning(
            WarningCode::UnsupportedFramework,
            format!("Framework \"{source_framework}\" is unsupported; cases use unknown framework provenance."),
            None,
            None,
        ));
    }

    let mut test_cases = Vec::with_capacity(records.len());
    for (index, record) in records.iter().enumerate() {
        let normalized = normalize_test_case(framework, record, index);
        test_cases.push(normalized.test_case);
        warnings.extend(normalized.warnings);
    }
    NormalizationResult {
        test_cases,
        warnings,
    }
}

/// Normalize one record while retaining the exact JSON value in both raw locations.
pub fn normalize_test_case(
    framework: &str,
    input: &Value,
    source_index: usize,
) -> SingleNormalization {
    let source_framework = framework.to_owned();
    let canonical_framework = CanonicalFramework::from_source(framework);
    let raw = input.clone();
    let provenance = |raw: Value| TestCaseProvenance {
        source_framework: source_framework.clone(),
        framework: canonical_framework.clone(),
        source_index,
        raw,
    };

    let Some(record) = input.as_object() else {
        return SingleNormalization {
            test_case: CanonicalTestCase {
                path: "unknown".to_owned(),
                name: "unknown".to_owned(),
                status: CanonicalStatus::Unknown,
                duration_ms: None,
                started_at: None,
                failure_details: None,
                tags: None,
                metadata: None,
                raw: raw.clone(),
                provenance: provenance(raw),
            },
            warnings: vec![warning(
                WarningCode::MalformedRecord,
                format!("Parsed test case at index {source_index} is not an object; retained as unknown."),
                Some(source_index),
                None,
            )],
        };
    };

    let mut warnings = Vec::new();
    let path = read_string(
        record,
        &[
            "path", "file", "filePath", "filepath", "testFile", "filename",
        ],
    );
    let name = read_string(
        record,
        &[
            "name",
            "title",
            "fullName",
            "fullTitle",
            "testName",
            "nodeid",
        ],
    );
    if path.is_none() {
        warnings.push(warning(
            WarningCode::MissingField,
            "Test case path is missing.",
            Some(source_index),
            Some("path"),
        ));
    }
    if name.is_none() {
        warnings.push(warning(
            WarningCode::MissingField,
            "Test case name is missing.",
            Some(source_index),
            Some("name"),
        ));
    }

    let status_input = read_status_value(record);
    let status = status_input
        .as_ref()
        .and_then(status_from_value)
        .unwrap_or_else(|| infer_status(record));
    if status == CanonicalStatus::Unknown {
        let (code, message) = match status_input.as_ref() {
            None => (
                WarningCode::MissingField,
                "Test case status is missing; classified as unknown.".to_owned(),
            ),
            Some(value) => (
                WarningCode::UnknownStatus,
                format!(
                    "Test case status \"{}\" is unsupported; classified as unknown.",
                    display_value(value)
                ),
            ),
        };
        warnings.push(warning(code, message, Some(source_index), Some("status")));
    }

    let (duration_ms, duration_supplied, duration_field) = read_duration_ms(record);
    if duration_supplied && duration_ms.is_none() {
        warnings.push(warning(
            WarningCode::InvalidField,
            "Test case duration is not a finite non-negative number within the supported range.",
            Some(source_index),
            Some(duration_field),
        ));
    }

    let started_input = first_present(record, &["startedAt", "startTime", "start", "timestamp"]);
    let started_at = started_input.and_then(canonical_started_at);
    if started_input.is_some() && started_at.is_none() {
        warnings.push(warning(
            WarningCode::InvalidField,
            "Test case start time is invalid.",
            Some(source_index),
            Some("startedAt"),
        ));
    }

    let details_input = first_present(record, &["failureDetails", "failure", "error", "exception"]);
    let failure_details = details_input.and_then(stable_details);
    if details_input.is_some() && failure_details.is_none() {
        warnings.push(warning(
            WarningCode::InvalidField,
            "Test case failure details could not be represented as text.",
            Some(source_index),
            Some("failureDetails"),
        ));
    }

    let tags = match record.get("tags") {
        None => None,
        Some(Value::Array(values)) => {
            let strings: Vec<String> = values.iter().filter_map(non_empty_string).collect();
            if values.iter().any(|value| non_empty_string(value).is_none()) {
                warnings.push(warning(
                    WarningCode::InvalidField,
                    "Non-string test case tags were omitted.",
                    Some(source_index),
                    Some("tags"),
                ));
            }
            (!strings.is_empty()).then_some(strings)
        }
        Some(_) => {
            warnings.push(warning(
                WarningCode::InvalidField,
                "Test case tags must be an array of strings.",
                Some(source_index),
                Some("tags"),
            ));
            None
        }
    };

    let metadata = match record.get("metadata") {
        None => None,
        Some(Value::Object(value)) => Some(Value::Object(value.clone())),
        Some(_) => {
            warnings.push(warning(
                WarningCode::InvalidField,
                "Test case metadata must be an object.",
                Some(source_index),
                Some("metadata"),
            ));
            None
        }
    };

    SingleNormalization {
        test_case: CanonicalTestCase {
            path: path.unwrap_or_else(|| "unknown".to_owned()),
            name: name.unwrap_or_else(|| "unknown".to_owned()),
            status,
            duration_ms,
            started_at,
            failure_details,
            tags,
            metadata,
            raw: raw.clone(),
            provenance: provenance(raw),
        },
        warnings,
    }
}

fn read_string(record: &Map<String, Value>, fields: &[&str]) -> Option<String> {
    fields
        .iter()
        .find_map(|field| record.get(*field).and_then(non_empty_string))
}

fn non_empty_string(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
}

fn first_present<'a>(record: &'a Map<String, Value>, fields: &[&str]) -> Option<&'a Value> {
    fields.iter().find_map(|field| record.get(*field))
}

fn read_status_value(record: &Map<String, Value>) -> Option<Value> {
    for field in ["status", "outcome", "state", "testStatus"] {
        if let Some(value) = record.get(field) {
            return Some(value.clone());
        }
    }
    if let Some(value) = record.get("result") {
        if value.is_string() {
            return Some(value.clone());
        }
        if let Some(nested) = value.as_object() {
            if let Some(value) = first_present(nested, &["status", "state", "outcome", "message"]) {
                return Some(value.clone());
            }
        }
    }
    if let Some(nested) = record.get("test").and_then(Value::as_object) {
        if let Some(value) = first_present(nested, &["status", "state", "outcome", "message"]) {
            return Some(value.clone());
        }
    }
    None
}

fn status_from_value(value: &Value) -> Option<CanonicalStatus> {
    let normalized = value
        .as_str()?
        .trim()
        .to_ascii_lowercase()
        .replace([' ', '_', '-'], "");
    if normalized.is_empty() {
        return None;
    }
    Some(match normalized.as_str() {
        "pass" | "passed" | "success" | "successful" | "succeeded" | "ok" | "green" => {
            CanonicalStatus::Pass
        }
        "fail" | "failed" | "failure" | "failing" | "red" => CanonicalStatus::Fail,
        "skip" | "skipped" | "pending" | "todo" | "disabled" | "ignored" | "notrun"
        | "notexecuted" => CanonicalStatus::Skip,
        "error" | "errored" | "exception" | "timedout" | "timeout" | "crashed" | "broken" => {
            CanonicalStatus::Error
        }
        _ => CanonicalStatus::Unknown,
    })
}

fn infer_status(record: &Map<String, Value>) -> CanonicalStatus {
    if ["error", "errors", "exception"]
        .iter()
        .any(|key| record.contains_key(*key))
    {
        CanonicalStatus::Error
    } else if ["failure", "failures", "failureDetails"]
        .iter()
        .any(|key| record.contains_key(*key))
    {
        CanonicalStatus::Fail
    } else if ["skipped", "pending", "todo", "disabled"]
        .iter()
        .any(|key| record.contains_key(*key))
    {
        CanonicalStatus::Skip
    } else {
        CanonicalStatus::Unknown
    }
}

fn read_duration_ms(record: &Map<String, Value>) -> (Option<u64>, bool, &'static str) {
    if let Some(value) = record.get("durationMs") {
        return (duration_to_ms(value, 1.0), true, "durationMs");
    }
    if let Some(value) = record.get("durationSeconds") {
        return (duration_to_ms(value, 1_000.0), true, "durationSeconds");
    }
    if let Some(value) = record.get("timeSeconds") {
        return (duration_to_ms(value, 1_000.0), true, "timeSeconds");
    }
    if let Some(value) = record.get("duration") {
        // `duration` is milliseconds for compatibility with the existing parser contract.
        return (duration_to_ms(value, 1.0), true, "durationMs");
    }
    (None, false, "durationMs")
}

fn duration_to_ms(value: &Value, multiplier: f64) -> Option<u64> {
    let number = value.as_f64()?;
    if !number.is_finite() || number < 0.0 || !multiplier.is_finite() {
        return None;
    }
    let rounded = (number * multiplier).round();
    if !rounded.is_finite() || rounded > u64::MAX as f64 {
        return None;
    }
    Some(rounded as u64)
}

fn canonical_started_at(value: &Value) -> Option<String> {
    let timestamp = match value {
        Value::String(value) => DateTime::parse_from_rfc3339(value)
            .ok()?
            .with_timezone(&Utc),
        Value::Number(number) => {
            let number = number.as_f64()?;
            if !number.is_finite() {
                return None;
            }
            // Numeric timestamps are milliseconds unless they are clearly Unix seconds.
            let millis = if number.abs() < 100_000_000_000.0 {
                number * 1_000.0
            } else {
                number
            };
            let millis = millis.round();
            if !millis.is_finite() || millis < i64::MIN as f64 || millis > i64::MAX as f64 {
                return None;
            }
            DateTime::<Utc>::from_timestamp_millis(millis as i64)?
        }
        _ => return None,
    };
    Some(timestamp.to_rfc3339_opts(SecondsFormat::Millis, true))
}

fn stable_details(value: &Value) -> Option<String> {
    match value {
        Value::String(text) if !text.is_empty() => Some(text.clone()),
        Value::Array(values) => {
            let strings: Vec<&str> = values
                .iter()
                .filter_map(Value::as_str)
                .filter(|s| !s.is_empty())
                .collect();
            (!strings.is_empty()).then(|| strings.join("\n\n"))
        }
        Value::Object(object) => {
            let strings: Vec<&str> = ["message", "stack", "longrepr", "#text"]
                .iter()
                .filter_map(|key| object.get(*key).and_then(Value::as_str))
                .filter(|s| !s.is_empty())
                .collect();
            (!strings.is_empty()).then(|| strings.join("\n\n"))
        }
        _ => None,
    }
}

fn display_value(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_owned)
        .unwrap_or_else(|| value.to_string())
}

/// A dependency-free adapter contract. RabbitMQ code should implement this trait in the
/// ingestion service, keeping delivery/ack/retry policy outside normalization rules.
pub trait MessageTransport {
    type Error;
    fn receive(&mut self) -> Result<Option<Vec<u8>>, Self::Error>;
    fn publish(&mut self, payload: &[u8]) -> Result<(), Self::Error>;
}

#[derive(Debug)]
pub enum WorkerError<E> {
    Transport(E),
    InvalidJson(serde_json::Error),
    Contract(String),
    Serialization(serde_json::Error),
}

impl<E: fmt::Debug> fmt::Display for WorkerError<E> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Transport(error) => write!(formatter, "transport error: {error:?}"),
            Self::InvalidJson(error) => write!(formatter, "invalid input JSON: {error}"),
            Self::Contract(error) => write!(formatter, "invalid message contract: {error}"),
            Self::Serialization(error) => write!(formatter, "output serialization error: {error}"),
        }
    }
}

impl<E: fmt::Debug> std::error::Error for WorkerError<E> {}

pub struct NormalizationWorker<T> {
    transport: T,
}

impl<T: MessageTransport> NormalizationWorker<T> {
    pub fn new(transport: T) -> Self {
        Self { transport }
    }

    /// Process one delivery. An empty queue returns `Ok(false)`; a published result returns `Ok(true)`.
    pub fn process_once(&mut self) -> Result<bool, WorkerError<T::Error>> {
        let Some(payload) = self.transport.receive().map_err(WorkerError::Transport)? else {
            return Ok(false);
        };
        let input: InputMessage =
            serde_json::from_slice(&payload).map_err(WorkerError::InvalidJson)?;
        if input.schema_version != CONTRACT_VERSION {
            return Err(WorkerError::Contract(format!(
                "unsupported schema_version {:?}; expected {:?}",
                input.schema_version, CONTRACT_VERSION
            )));
        }
        if input.records.len() > limits::MAX_TEST_CASES {
            return Err(WorkerError::Contract(format!(
                "records exceed shared limit of {}",
                limits::MAX_TEST_CASES
            )));
        }
        let result = normalize_test_cases(&input.source_framework, &input.records);
        if result.warnings.len() > limits::MAX_WARNINGS {
            return Err(WorkerError::Contract(format!(
                "warnings exceed shared limit of {}",
                limits::MAX_WARNINGS
            )));
        }
        let output = OutputMessage {
            schema_version: CONTRACT_VERSION.to_owned(),
            message_id: input.message_id,
            tenant_id: input.tenant_id,
            receipt_id: input.receipt_id,
            source_framework: input.source_framework,
            metadata: input.metadata,
            result,
        };
        let serialized = serde_json::to_vec(&output).map_err(WorkerError::Serialization)?;
        self.transport
            .publish(&serialized)
            .map_err(WorkerError::Transport)?;
        Ok(true)
    }
}

pub fn normalize_message_json(payload: &[u8]) -> Result<Vec<u8>, WorkerError<()>> {
    let input: InputMessage = serde_json::from_slice(payload).map_err(WorkerError::InvalidJson)?;
    if input.schema_version != CONTRACT_VERSION {
        return Err(WorkerError::Contract(format!(
            "unsupported schema_version {:?}; expected {:?}",
            input.schema_version, CONTRACT_VERSION
        )));
    }
    if input.records.len() > limits::MAX_TEST_CASES {
        return Err(WorkerError::Contract(format!(
            "records exceed shared limit of {}",
            limits::MAX_TEST_CASES
        )));
    }
    let output = OutputMessage {
        schema_version: CONTRACT_VERSION.to_owned(),
        message_id: input.message_id,
        tenant_id: input.tenant_id,
        receipt_id: input.receipt_id,
        source_framework: input.source_framework.clone(),
        metadata: input.metadata,
        result: normalize_test_cases(&input.source_framework, &input.records),
    };
    if output.result.warnings.len() > limits::MAX_WARNINGS {
        return Err(WorkerError::Contract(format!(
            "warnings exceed shared limit of {}",
            limits::MAX_WARNINGS
        )));
    }
    serde_json::to_vec(&output).map_err(WorkerError::Serialization)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn normalizes_all_supported_frameworks_and_common_statuses() {
        let cases = vec![
            json!({"path":"a.xml","name":"junit","status":"pass"}),
            json!({"file":"a.ts","title":"jest","status":"failed"}),
            json!({"path":"a.py","nodeid":"a.py::test","outcome":"skipped"}),
            json!({"file":"a.ts","name":"pw","status":"timedOut"}),
            json!({"file":"a.js","fullTitle":"mocha","state":"passed"}),
            json!({"file":"a.ts","name":"vitest","outcome":"failed"}),
        ];
        let expected = [
            CanonicalStatus::Pass,
            CanonicalStatus::Fail,
            CanonicalStatus::Skip,
            CanonicalStatus::Error,
            CanonicalStatus::Pass,
            CanonicalStatus::Fail,
        ];
        for (framework, (case, expected_status)) in
            SUPPORTED_FRAMEWORKS.iter().zip(cases.iter().zip(expected))
        {
            let result = normalize_test_cases(framework, std::slice::from_ref(case));
            assert!(
                result.warnings.is_empty(),
                "{framework}: {:?}",
                result.warnings
            );
            assert_eq!(result.test_cases[0].status, expected_status);
            assert_eq!(result.test_cases[0].provenance.source_framework, *framework);
            assert_eq!(result.test_cases[0].provenance.source_index, 0);
        }
    }

    #[test]
    fn malformed_and_unknown_records_are_retained_in_order() {
        let result = normalize_test_cases(
            "jest",
            &[
                Value::Null,
                json!({"path":"","name":"","status":"flaky-ish","durationMs":-1,"startedAt":"not a date"}),
            ],
        );
        assert_eq!(result.test_cases.len(), 2);
        assert_eq!(result.test_cases[0].status, CanonicalStatus::Unknown);
        assert_eq!(result.test_cases[0].raw, Value::Null);
        assert_eq!(result.test_cases[1].path, "unknown");
        assert_eq!(result.test_cases[1].name, "unknown");
        let codes: Vec<WarningCode> = result
            .warnings
            .into_iter()
            .map(|warning| warning.code)
            .collect();
        assert_eq!(
            codes,
            vec![
                WarningCode::MalformedRecord,
                WarningCode::MissingField,
                WarningCode::MissingField,
                WarningCode::UnknownStatus,
                WarningCode::InvalidField,
                WarningCode::InvalidField
            ]
        );
    }

    #[test]
    fn preserves_failure_details_and_arbitrary_raw_fields() {
        let raw = json!({"file":"spec.ts","title":"throws","status":"error","error":{"message":"boom","stack":"at test"},"providerSpecific":{"retry":2}});
        let result = normalize_test_case("vitest", &raw, 7);
        assert!(result.warnings.is_empty());
        assert_eq!(
            result.test_case.failure_details.as_deref(),
            Some("boom\n\nat test")
        );
        assert_eq!(result.test_case.raw, raw);
        assert_eq!(result.test_case.provenance.raw, raw);
        assert_eq!(result.test_case.provenance.source_index, 7);
    }

    #[test]
    fn normalizes_duration_and_timestamp_deterministically() {
        let input = json!({"file":"tests/a.test.ts","fullTitle":"suite > works","status":"passed","duration":12.6,"startTime":"2026-01-02T03:04:05+02:00","tags":["smoke"],"metadata":{"shard":1}});
        let first = normalize_test_cases("mocha", std::slice::from_ref(&input));
        let second = normalize_test_cases("mocha", std::slice::from_ref(&input));
        assert_eq!(first, second);
        let case = &first.test_cases[0];
        assert_eq!(case.duration_ms, Some(13));
        assert_eq!(case.started_at.as_deref(), Some("2026-01-02T01:04:05.000Z"));
        assert_eq!(
            serde_json::to_string(&first).unwrap(),
            serde_json::to_string(&second).unwrap()
        );
    }

    #[test]
    fn safely_handles_duration_and_timestamp_boundaries() {
        let result = normalize_test_cases(
            "pytest",
            &[
                json!({"name":"zero","durationMs":0,"timestamp":0}),
                json!({"name":"fraction","durationSeconds":0.0005,"timestamp":1700000000}),
                json!({"name":"negative","durationMs":-0.1,"timestamp":-1}),
                json!({"name":"huge","durationMs":1e300,"timestamp":1e300}),
            ],
        );
        assert_eq!(result.test_cases[0].duration_ms, Some(0));
        assert_eq!(
            result.test_cases[0].started_at.as_deref(),
            Some("1970-01-01T00:00:00.000Z")
        );
        assert_eq!(result.test_cases[1].duration_ms, Some(1));
        assert!(result.test_cases[1].started_at.is_some());
        assert!(result.test_cases[2].duration_ms.is_none());
        assert!(result.test_cases[2].started_at.is_some());
        assert!(result.test_cases[3].duration_ms.is_none());
        assert!(result.test_cases[3].started_at.is_none());
        assert!(
            result
                .warnings
                .iter()
                .filter(|warning| warning.code == WarningCode::InvalidField)
                .count()
                >= 3
        );
    }

    #[test]
    fn unknown_framework_warns_once_and_keeps_source_name() {
        let result = normalize_test_cases(
            "custom-runner",
            &[json!({"path":"x","name":"test","status":"passed"})],
        );
        assert_eq!(result.test_cases[0].status, CanonicalStatus::Pass);
        assert_eq!(
            result.test_cases[0].provenance.framework,
            CanonicalFramework::Unknown
        );
        assert_eq!(
            result.test_cases[0].provenance.source_framework,
            "custom-runner"
        );
        assert_eq!(result.warnings.len(), 1);
        assert_eq!(result.warnings[0].code, WarningCode::UnsupportedFramework);
    }

    #[test]
    fn serialization_sorts_object_keys_and_is_repeatable() {
        let input = InputMessage::new(
            "m",
            "t",
            "r",
            "jest",
            vec![json!({"z":1,"a":2,"status":"pass","name":"n","path":"p"})],
        );
        let payload_a = serde_json::to_vec(&input).unwrap();
        let payload_b = serde_json::to_vec(&input).unwrap();
        assert_eq!(payload_a, payload_b);
        let output_a = normalize_message_json(&payload_a).unwrap();
        let output_b = normalize_message_json(&payload_b).unwrap();
        assert_eq!(output_a, output_b);
        let text = String::from_utf8(output_a).unwrap();
        assert!(text.find("\"a\":2").unwrap() < text.find("\"z\":1").unwrap());
    }

    #[test]
    fn message_contract_rejects_wrong_schema() {
        let payload = br#"{"schema_version":"old","message_id":"m","tenant_id":"t","receipt_id":"r","source_framework":"jest","records":[]}"#;
        assert!(matches!(
            normalize_message_json(payload),
            Err(WorkerError::Contract(_))
        ));
    }
}
