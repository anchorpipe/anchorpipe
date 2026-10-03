# Anchorpipe Rust ingestion worker

A fail-closed HTTP ingestion worker. It authenticates a bounded request body, validates a versioned JSON envelope, and hands the envelope to an injected durable repository/queue port.

## Contract

`POST /v1/ingest` accepts a JSON `IngestionEnvelopeV1`:

```json
{
  "version": "v1",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "tenant-a",
  "event_type": "invoice.created",
  "occurred_at": "2025-01-02T03:04:05Z",
  "payload": {"amount": 4}
}
```

Unknown fields are rejected. `event_id` is a canonical UUID string, text fields are bounded and control-character-free, `occurred_at` has a strict RFC3339 shape, and `payload` cannot be null.

Authentication uses HMAC-v1 headers:

- `x-anchor-timestamp`: Unix seconds; accepted only within the configured clock skew.
- `x-anchor-nonce`: 1–128 printable bytes (newline, carriage return, and colon are rejected).
- `x-anchor-body-sha256`: lowercase SHA-256 hex digest of the exact request bytes.
- `x-anchor-signature`: lowercase hex HMAC-SHA256 over the canonical string, with no trailing newline:

```text
v1\n{timestamp}\n{nonce}\n{body_sha256}
```

The current port verifies nonce syntax but does not claim replay protection. A durable adapter should atomically record/consume `(tenant, nonce)` or an equivalent idempotency key.

## Endpoints and errors

- `GET /healthz` is a process health check and does not depend on the durable backend.
- `GET /readyz` checks the injected durable port; the default binary adapter is explicitly unavailable, so readiness is 503 until a real adapter is wired.
- `POST /v1/ingest` returns 202 only after the durable port accepts the envelope.

Errors use stable JSON codes such as `BODY_TOO_LARGE`, `AUTHENTICATION_FAILED`, `VALIDATION_FAILED`, `DURABLE_INGESTION_UNAVAILABLE`, and `NOT_READY`. Validation details expose only stable validation codes, not request contents.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `INGESTION_BIND_ADDR` | `0.0.0.0:8080` | Socket address |
| `INGESTION_HMAC_SECRET` | required | 32–4096 bytes; never logged |
| `INGESTION_MAX_BODY_BYTES` | `1048576` | 1 byte–16 MiB; body is bounded before collection |
| `INGESTION_MAX_CLOCK_SKEW_SECONDS` | `300` | 1–86400 |
| `INGESTION_SERVICE_NAME` | `anchorpipe-ingestion` | 1–128 bytes |

## Development

```bash
cargo fmt --all -- --check
cargo check --offline
cargo test --offline
```

The Docker image builds with the stable Rust toolchain and runs as a non-root user. No persistence adapter is included in this crate: external repository/queue implementations must remain behind `DurableIngestionPort`.
