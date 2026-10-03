# Anchorpipe Rust contracts

Small, dependency-light Rust crate for the wire contracts shared by future Anchorpipe services. It is intentionally separate from the existing TypeScript services and is not registered in the root workspace.

## Contract inventory

- `IngestionEnvelope`: versioned ingestion boundary containing message metadata, source facts, and an opaque JSON payload.
- `CanonicalTestCase`: normalized test facts with UTC timestamps, bounded tags/metadata, and retained raw/provenance data.
- `NormalizationWarning`: non-fatal normalization diagnostics with stable string codes.
- `OutboxEvent`: durable event envelope for publication after a transaction commits.
- `HealthResponse` and `DependencyHealth`: credential-free health reporting.
- `ErrorCode`: stable string newtype with common code constants; unknown future codes remain representable.
- `MessageMetadata`: tenant, message, correlation, causation, idempotency, producer, and UTC send time metadata.

## Validation and compatibility

Use `from_json_strict::<T>(json)` at a boundary that must reject producer mistakes, or `from_json_forward_compatible::<T>(json)` while rolling out additive fields. Both modes deserialize and then run the same bounded validators. Strict mode reports unknown JSON paths; forward-compatible mode ignores them. Unknown fields are not silently accepted unless the caller opts into that policy.

The validators bound strings, IDs, JSON payload bytes/depth, collection sizes, test durations, and dependency counts. Timestamps use `chrono::DateTime<Utc>` and serialize as UTC RFC 3339 values. Payloads, raw evidence, failure details, metadata values, and idempotency keys are redacted from custom `Debug` output where they could contain secrets or customer evidence.

This crate does not authenticate payloads, enforce tenant authorization, or validate provider-specific schemas. Those checks belong at the service boundary. The JSON payload remains opaque so a service can apply its own schema without changing this shared crate.

## Local verification

```bash
cargo fmt -- --check
cargo check
cargo test
```

The crate is standalone today. It can later be added to a Cargo workspace or consumed by individual services without modifying the existing TypeScript workspace.
