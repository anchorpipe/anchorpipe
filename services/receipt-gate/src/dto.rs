use anchorpipe_pipeline_contracts::limits;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct IngestionEnvelopeV1 {
    pub version: EnvelopeVersion,
    pub event_id: String,
    pub tenant_id: String,
    pub event_type: String,
    pub occurred_at: String,
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EnvelopeVersion {
    V1,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, thiserror::Error, PartialEq, Eq)]
#[error("{code}: {message}")]
pub struct ValidationError {
    pub code: &'static str,
    pub message: String,
}

impl IngestionEnvelopeV1 {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.version != EnvelopeVersion::V1 {
            return Err(err(
                "ENVELOPE_VERSION_UNSUPPORTED",
                "only version v1 is accepted",
            ));
        }
        validate_id(&self.event_id, "event_id", "ENVELOPE_EVENT_ID_INVALID")?;
        validate_text(
            &self.tenant_id,
            "tenant_id",
            "ENVELOPE_TENANT_ID_INVALID",
            128,
        )?;
        validate_text(
            &self.event_type,
            "event_type",
            "ENVELOPE_EVENT_TYPE_INVALID",
            128,
        )?;
        if !is_rfc3339_like(&self.occurred_at) {
            return Err(err(
                "ENVELOPE_OCCURRED_AT_INVALID",
                "occurred_at must be an RFC3339 timestamp",
            ));
        }
        if self.payload.is_null() {
            return Err(err("ENVELOPE_PAYLOAD_INVALID", "payload must not be null"));
        }
        let payload_bytes = serde_json::to_vec(&self.payload)
            .map_err(|_| err("ENVELOPE_PAYLOAD_INVALID", "payload must be valid JSON"))?;
        if payload_bytes.len() > limits::MAX_PAYLOAD_BYTES {
            return Err(err(
                "ENVELOPE_PAYLOAD_TOO_LARGE",
                "payload exceeds the shared contract size limit",
            ));
        }
        Ok(())
    }
}

fn validate_id(value: &str, field: &str, code: &'static str) -> Result<(), ValidationError> {
    if value.len() != 36
        || value.as_bytes().iter().enumerate().any(|(i, b)| {
            if [8, 13, 18, 23].contains(&i) {
                *b != b'-'
            } else {
                !b.is_ascii_hexdigit()
            }
        })
    {
        return Err(err(
            code,
            &format!("{field} must be a canonical UUID string"),
        ));
    }
    Ok(())
}

fn validate_text(
    value: &str,
    field: &str,
    code: &'static str,
    max: usize,
) -> Result<(), ValidationError> {
    if value.is_empty()
        || value.len() > max
        || value.trim() != value
        || !value.chars().all(|c| !c.is_control())
    {
        return Err(err(
            code,
            &format!("{field} must be 1-{max} non-control, non-whitespace-padded bytes"),
        ));
    }
    Ok(())
}

fn is_rfc3339_like(value: &str) -> bool {
    // Strict validation without pulling a date-time runtime into the worker.
    let bytes = value.as_bytes();
    let timezone_start = if bytes.last() == Some(&b'Z') {
        bytes.len() - 1
    } else if bytes.len() >= 6 {
        bytes.len() - 6
    } else {
        return false;
    };
    let timezone_valid = if bytes.get(timezone_start) == Some(&b'Z') {
        timezone_start + 1 == bytes.len()
    } else {
        bytes.len() == timezone_start + 6
            && matches!(bytes[timezone_start], b'+' | b'-')
            && bytes[timezone_start + 3] == b':'
            && bytes[timezone_start + 1..timezone_start + 3]
                .iter()
                .all(u8::is_ascii_digit)
            && bytes[timezone_start + 4..timezone_start + 6]
                .iter()
                .all(u8::is_ascii_digit)
            && parse_two(&bytes[timezone_start + 1..timezone_start + 3]).is_some_and(|v| v <= 23)
            && parse_two(&bytes[timezone_start + 4..timezone_start + 6]).is_some_and(|v| v <= 59)
    };
    let fraction_valid = if timezone_start == 19 {
        true
    } else if bytes.len() > 19 && timezone_start > 20 {
        bytes[19] == b'.' && bytes[20..timezone_start].iter().all(u8::is_ascii_digit)
    } else {
        false
    };
    bytes.len() >= 20
        && timezone_start >= 19
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit)
        && bytes[11..13].iter().all(u8::is_ascii_digit)
        && bytes[14..16].iter().all(u8::is_ascii_digit)
        && bytes[17..19].iter().all(u8::is_ascii_digit)
        && parse_two(&bytes[5..7]).is_some_and(|v| (1..=12).contains(&v))
        && parse_two(&bytes[8..10]).is_some_and(|v| (1..=31).contains(&v))
        && parse_two(&bytes[11..13]).is_some_and(|v| v <= 23)
        && parse_two(&bytes[14..16]).is_some_and(|v| v <= 59)
        && parse_two(&bytes[17..19]).is_some_and(|v| v <= 60)
        && fraction_valid
        && timezone_valid
}

fn parse_two(bytes: &[u8]) -> Option<u8> {
    (bytes.len() == 2 && bytes[0].is_ascii_digit() && bytes[1].is_ascii_digit())
        .then(|| (bytes[0] - b'0') * 10 + bytes[1] - b'0')
}

fn err(code: &'static str, message: &str) -> ValidationError {
    ValidationError {
        code,
        message: message.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid() -> IngestionEnvelopeV1 {
        IngestionEnvelopeV1 {
            version: EnvelopeVersion::V1,
            event_id: "550e8400-e29b-41d4-a716-446655440000".into(),
            tenant_id: "tenant-a".into(),
            event_type: "invoice.created".into(),
            occurred_at: "2025-01-02T03:04:05Z".into(),
            payload: json!({"amount": 4}),
        }
    }

    #[test]
    fn accepts_valid_envelope() {
        valid().validate().unwrap();
    }

    #[test]
    fn rejects_bad_id_and_null_payload() {
        let mut e = valid();
        e.event_id = "not-an-id".into();
        assert_eq!(e.validate().unwrap_err().code, "ENVELOPE_EVENT_ID_INVALID");
        let mut e = valid();
        e.payload = Value::Null;
        assert_eq!(e.validate().unwrap_err().code, "ENVELOPE_PAYLOAD_INVALID");
    }

    #[test]
    fn rejects_unknown_json_fields() {
        let value = serde_json::json!({"version":"v1","event_id":"550e8400-e29b-41d4-a716-446655440000","tenant_id":"t","event_type":"e","occurred_at":"2025-01-02T03:04:05Z","payload":{},"extra":1});
        assert!(serde_json::from_value::<IngestionEnvelopeV1>(value).is_err());
    }

    #[test]
    fn maps_unknown_version_to_stable_validation_error() {
        let value = serde_json::json!({"version":"v2","event_id":"550e8400-e29b-41d4-a716-446655440000","tenant_id":"t","event_type":"e","occurred_at":"2025-01-02T03:04:05Z","payload":{}});
        let envelope = serde_json::from_value::<IngestionEnvelopeV1>(value).unwrap();
        assert_eq!(
            envelope.validate().unwrap_err().code,
            "ENVELOPE_VERSION_UNSUPPORTED"
        );
    }
}
