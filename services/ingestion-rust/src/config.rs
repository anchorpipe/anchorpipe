use std::{env, net::SocketAddr};

const DEFAULT_MAX_BODY_BYTES: usize = 1_048_576;
const MAX_ALLOWED_BODY_BYTES: usize = 16 * 1024 * 1024;
const DEFAULT_CLOCK_SKEW_SECONDS: u64 = 300;

#[derive(Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub hmac_secret: Vec<u8>,
    pub max_body_bytes: usize,
    pub max_clock_skew_seconds: u64,
    pub service_name: String,
}

impl std::fmt::Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Config")
            .field("bind_addr", &self.bind_addr)
            .field("hmac_secret", &"[REDACTED]")
            .field("max_body_bytes", &self.max_body_bytes)
            .field("max_clock_skew_seconds", &self.max_clock_skew_seconds)
            .field("service_name", &self.service_name)
            .finish()
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("{code}: {message}")]
    Invalid { code: &'static str, message: String },
}

impl ConfigError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Invalid { code, .. } => code,
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let bind_addr = parse_addr("INGESTION_BIND_ADDR", "0.0.0.0:8080")?;
        let secret = env::var("INGESTION_HMAC_SECRET").map_err(|_| {
            invalid(
                "CONFIG_SECRET_REQUIRED",
                "INGESTION_HMAC_SECRET is required",
            )
        })?;
        let max_body_bytes = parse_usize("INGESTION_MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES)?;
        let max_clock_skew_seconds = parse_u64(
            "INGESTION_MAX_CLOCK_SKEW_SECONDS",
            DEFAULT_CLOCK_SKEW_SECONDS,
        )?;
        let service_name = env::var("INGESTION_SERVICE_NAME")
            .unwrap_or_else(|_| "anchorpipe-ingestion".to_string());
        let config = Self {
            bind_addr,
            hmac_secret: secret.into_bytes(),
            max_body_bytes,
            max_clock_skew_seconds,
            service_name,
        };
        config.validate()?;
        Ok(config)
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.hmac_secret.len() < 32 {
            return Err(invalid(
                "CONFIG_SECRET_TOO_SHORT",
                "INGESTION_HMAC_SECRET must be at least 32 bytes",
            ));
        }
        if self.hmac_secret.len() > 4096 {
            return Err(invalid(
                "CONFIG_SECRET_TOO_LONG",
                "INGESTION_HMAC_SECRET must not exceed 4096 bytes",
            ));
        }
        if self.max_body_bytes == 0 || self.max_body_bytes > MAX_ALLOWED_BODY_BYTES {
            return Err(invalid(
                "CONFIG_BODY_LIMIT_INVALID",
                &format!("max body bytes must be between 1 and {MAX_ALLOWED_BODY_BYTES}"),
            ));
        }
        if self.max_clock_skew_seconds == 0 || self.max_clock_skew_seconds > 86_400 {
            return Err(invalid(
                "CONFIG_CLOCK_SKEW_INVALID",
                "clock skew must be between 1 and 86400 seconds",
            ));
        }
        if self.service_name.trim().is_empty() || self.service_name.len() > 128 {
            return Err(invalid(
                "CONFIG_SERVICE_NAME_INVALID",
                "service name must be 1-128 non-whitespace bytes",
            ));
        }
        Ok(())
    }

    pub fn redacted_summary(&self) -> String {
        format!(
            "service_name={} bind_addr={} max_body_bytes={} max_clock_skew_seconds={} hmac_secret=[REDACTED]",
            self.service_name, self.bind_addr, self.max_body_bytes, self.max_clock_skew_seconds
        )
    }
}

fn invalid(code: &'static str, message: &str) -> ConfigError {
    ConfigError::Invalid {
        code,
        message: message.to_string(),
    }
}

fn parse_addr(name: &'static str, default: &str) -> Result<SocketAddr, ConfigError> {
    let value = env::var(name).unwrap_or_else(|_| default.to_string());
    value
        .parse()
        .map_err(|e| invalid(name_to_code(name), &format!("invalid socket address: {e}")))
}

fn parse_usize(name: &'static str, default: usize) -> Result<usize, ConfigError> {
    parse_integer(name, env::var(name).unwrap_or_else(|_| default.to_string()))
}

fn parse_u64(name: &'static str, default: u64) -> Result<u64, ConfigError> {
    parse_integer(name, env::var(name).unwrap_or_else(|_| default.to_string()))
}

fn parse_integer<T: std::str::FromStr>(name: &'static str, value: String) -> Result<T, ConfigError>
where
    T::Err: std::fmt::Display,
{
    value
        .parse()
        .map_err(|e| invalid(name_to_code(name), &format!("invalid integer: {e}")))
}

fn name_to_code(name: &str) -> &'static str {
    match name {
        "INGESTION_BIND_ADDR" => "CONFIG_BIND_ADDR_INVALID",
        "INGESTION_MAX_BODY_BYTES" => "CONFIG_BODY_LIMIT_INVALID",
        "INGESTION_MAX_CLOCK_SKEW_SECONDS" => "CONFIG_CLOCK_SKEW_INVALID",
        _ => "CONFIG_VALUE_INVALID",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> Config {
        Config {
            bind_addr: "127.0.0.1:8080".parse().unwrap(),
            hmac_secret: vec![b'x'; 32],
            max_body_bytes: 1024,
            max_clock_skew_seconds: 300,
            service_name: "test".into(),
        }
    }

    #[test]
    fn rejects_short_secret() {
        let mut c = valid();
        c.hmac_secret = vec![b'x'; 31];
        assert_eq!(c.validate().unwrap_err().code(), "CONFIG_SECRET_TOO_SHORT");
    }

    #[test]
    fn rejects_oversized_limit_and_redacts_secret() {
        let mut c = valid();
        c.max_body_bytes = 16 * 1024 * 1024 + 1;
        assert_eq!(
            c.validate().unwrap_err().code(),
            "CONFIG_BODY_LIMIT_INVALID"
        );
        assert!(!c.redacted_summary().contains("xxxxxxxx"));
        assert!(!format!("{c:?}").contains("xxxxxxxx"));
    }
}
