use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone)]
pub struct VerificationInput<'a> {
    pub timestamp: &'a str,
    pub nonce: &'a str,
    pub body_digest: &'a str,
    pub signature: &'a str,
    pub body: &'a [u8],
}

#[derive(Debug, Clone)]
pub struct HmacV1Verifier {
    secret: Vec<u8>,
    max_clock_skew_seconds: u64,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum AuthError {
    #[error("AUTH_TIMESTAMP_INVALID")]
    InvalidTimestamp,
    #[error("AUTH_TIMESTAMP_EXPIRED")]
    TimestampExpired,
    #[error("AUTH_NONCE_INVALID")]
    InvalidNonce,
    #[error("AUTH_BODY_DIGEST_INVALID")]
    InvalidBodyDigest,
    #[error("AUTH_SIGNATURE_INVALID")]
    InvalidSignature,
}

impl HmacV1Verifier {
    pub fn new(secret: impl Into<Vec<u8>>, max_clock_skew_seconds: u64) -> Self {
        Self {
            secret: secret.into(),
            max_clock_skew_seconds,
        }
    }

    pub fn verify(&self, input: &VerificationInput<'_>) -> Result<(), AuthError> {
        let timestamp: i64 = input
            .timestamp
            .parse()
            .map_err(|_| AuthError::InvalidTimestamp)?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| AuthError::InvalidTimestamp)?
            .as_secs() as i64;
        if (timestamp - now).unsigned_abs() > self.max_clock_skew_seconds {
            return Err(AuthError::TimestampExpired);
        }
        if input.nonce.is_empty()
            || input.nonce.len() > 128
            || !input
                .nonce
                .bytes()
                .all(|b| b.is_ascii_graphic() && b != b'\n' && b != b'\r' && b != b':')
        {
            return Err(AuthError::InvalidNonce);
        }
        let calculated_digest = body_digest_hex(input.body);
        if calculated_digest
            .as_bytes()
            .ct_eq(input.body_digest.as_bytes())
            .unwrap_u8()
            != 1
        {
            return Err(AuthError::InvalidBodyDigest);
        }
        let signature = hex::decode(input.signature).map_err(|_| AuthError::InvalidSignature)?;
        let mut mac =
            HmacSha256::new_from_slice(&self.secret).expect("HMAC accepts arbitrary key length");
        mac.update(canonical_string(input.timestamp, input.nonce, input.body_digest).as_bytes());
        mac.verify_slice(&signature)
            .map_err(|_| AuthError::InvalidSignature)
    }

    pub fn sign(&self, timestamp: &str, nonce: &str, body: &[u8]) -> String {
        let digest = body_digest_hex(body);
        let mut mac =
            HmacSha256::new_from_slice(&self.secret).expect("HMAC accepts arbitrary key length");
        mac.update(canonical_string(timestamp, nonce, &digest).as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }
}

pub fn body_digest_hex(body: &[u8]) -> String {
    hex::encode(Sha256::digest(body))
}
pub fn canonical_string(timestamp: &str, nonce: &str, body_digest: &str) -> String {
    format!("v1\n{timestamp}\n{nonce}\n{body_digest}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonicalization_is_stable_and_signatures_verify() {
        let verifier = HmacV1Verifier::new(vec![b's'; 32], 300);
        assert_eq!(
            canonical_string("1700000000", "n-1", "abc"),
            "v1\n1700000000\nn-1\nabc"
        );
        let body = br#"{"ok":true}"#;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string();
        let digest = body_digest_hex(body);
        let signature = verifier.sign(&timestamp, "nonce-1", body);
        verifier
            .verify(&VerificationInput {
                timestamp: &timestamp,
                nonce: "nonce-1",
                body_digest: &digest,
                signature: &signature,
                body,
            })
            .unwrap();
    }

    #[test]
    fn rejects_digest_or_timestamp_tampering() {
        let verifier = HmacV1Verifier::new(vec![b's'; 32], 300);
        let body = b"body";
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string();
        let signature = verifier.sign(&timestamp, "nonce-1", body);
        assert_eq!(
            verifier
                .verify(&VerificationInput {
                    timestamp: &timestamp,
                    nonce: "nonce-1",
                    body_digest: "00",
                    signature: &signature,
                    body
                })
                .unwrap_err(),
            AuthError::InvalidBodyDigest
        );
        assert_eq!(
            verifier
                .verify(&VerificationInput {
                    timestamp: "1",
                    nonce: "nonce-1",
                    body_digest: &body_digest_hex(body),
                    signature: &signature,
                    body
                })
                .unwrap_err(),
            AuthError::TimestampExpired
        );
    }
}
