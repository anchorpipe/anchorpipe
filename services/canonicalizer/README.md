# Anchorpipe Rust Normalizer

A transport-neutral, production-oriented normalization engine for parsed test-case JSON records. It supports **junit, jest, pytest, playwright, mocha, and vitest** and emits deterministic canonical records with statuses `pass`, `fail`, `skip`, `error`, or `unknown`.

## Guarantees

- **No record loss:** every input array position produces exactly one canonical test case. Malformed values (including `null`, arrays, and scalars) become an `unknown` case and generate a `MALFORMED_RECORD` warning.
- **Raw provenance:** the complete parsed JSON value is retained in both `raw` and `provenance.raw`, together with source framework and stable source index.
- **Deterministic output:** `serde_json` serializes object keys in sorted order; normalization is pure and preserves input ordering. Repeated serialization of the same message is byte-identical.
- **Safe coercion:** negative, non-finite, overflowing, and invalid duration/timestamp values are omitted and warned about rather than panicking or being silently accepted.
- **Structured warnings:** warnings have a stable code, message, source index where applicable, and canonical field.
- **Framework isolation:** an unsupported source framework generates one `UNSUPPORTED_FRAMEWORK` warning, retains its original name, and uses canonical framework `unknown`. Status mapping still works for recognized status spellings.

## Input/output contract (`normalizer.v1`)

Input messages are JSON objects:

```json
{
  "schema_version": "normalizer.v1",
  "message_id": "message-123",
  "tenant_id": "tenant-1",
  "receipt_id": "receipt-1",
  "source_framework": "jest",
  "records": [
    {"path":"src/a.test.ts", "name":"works", "status":"passed", "durationMs":12.6}
  ],
  "metadata": {"providerRunId":"run-7"}
}
```

Output messages preserve message identity and return `result.test_cases` and `result.warnings`:

```json
{
  "schema_version":"normalizer.v1",
  "message_id":"message-123",
  "tenant_id":"tenant-1",
  "receipt_id":"receipt-1",
  "source_framework":"jest",
  "result": {
    "test_cases": [{
      "path":"src/a.test.ts", "name":"works", "status":"pass", "duration_ms":13,
      "raw":{"durationMs":12.6,"name":"works","path":"src/a.test.ts","status":"passed"},
      "provenance":{"source_framework":"jest","framework":"jest","source_index":0,"raw":{"durationMs":12.6,"name":"works","path":"src/a.test.ts","status":"passed"}}
    }],
    "warnings": []
  }
}
```

`metadata` on the input envelope is preserved on the output envelope but is not copied into each test case. Unknown envelope schema versions are rejected by `normalize_message_json` and `NormalizationWorker` so an adapter can retry or dead-letter them explicitly.

## Canonicalization rules

- Paths: first non-empty string among `path`, `file`, `filePath`, `filepath`, `testFile`, `filename`; otherwise `"unknown"` with `MISSING_FIELD`.
- Names: first non-empty string among `name`, `title`, `fullName`, `fullTitle`, `testName`, `nodeid`; otherwise `"unknown"` with `MISSING_FIELD`.
- Status: `status`, `outcome`, `state`, `testStatus`, string `result`, then nested result/test status fields. Common spellings map to the five canonical statuses. If no status maps, presence of `error`/`exception`, `failure`/`failureDetails`, or `skipped`/`pending`/`todo`/`disabled` provides conservative inference; otherwise status is `unknown` with a warning. Errors are never conflated with assertion failures.
- Durations: `durationMs` and legacy `duration` are milliseconds; `durationSeconds` and `timeSeconds` are converted to milliseconds. Values are rounded to the nearest integer and may be zero. Invalid values warn and are omitted.
- Timestamps: `startedAt`, `startTime`, `start`, or `timestamp` accepts RFC3339 strings. Numeric values are Unix milliseconds unless clearly Unix seconds (absolute value below `100000000000`). Output is UTC RFC3339 with millisecond precision, such as `2026-01-02T01:04:05.000Z`.
- Failure details: strings, string arrays, or `message`/`stack`/`longrepr`/`#text` objects are joined with blank lines. Other values warn and are omitted.
- Tags: only string entries are retained; invalid entries warn. Metadata must be a JSON object.

## RabbitMQ adapter boundary

`MessageTransport` exposes only:

```rust
trait MessageTransport {
    type Error;
    fn receive(&mut self) -> Result<Option<Vec<u8>>, Self::Error>;
    fn publish(&mut self, payload: &[u8]) -> Result<(), Self::Error>;
}
```

`NormalizationWorker::process_once` receives one body, validates the schema, normalizes, and publishes one output body. It does not acknowledge, retry, dead-letter, connect to RabbitMQ, or mutate Prisma state; those delivery and persistence decisions remain in the ingestion/RabbitMQ adapter. This keeps the core deterministic and easy to exercise with an in-memory transport.

## Running

```bash
cargo fmt -- --check
cargo check
cargo test

# Optional local NDJSON mode (one input message per line):
echo '{"schema_version":"normalizer.v1","message_id":"m","tenant_id":"t","receipt_id":"r","source_framework":"jest","records":[{"path":"a","name":"works","status":"passed"}]}' \
  | cargo run --quiet
```

The included `Dockerfile` builds a small Debian runtime image. No RabbitMQ client is included intentionally; add the adapter dependency in the service that owns broker connectivity.
