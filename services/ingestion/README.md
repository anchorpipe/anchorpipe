## Ingestion Worker (dev/GB helper)

- Scope: development-only consumer for `test.ingestion` to validate async persistence, retries, and DLQ behavior.
- Enable with: set `INGESTION_WORKER_ENABLED=true` and `RABBIT_URL=amqp://...`.
- MVP ingress remains the Next.js Route Handler in `apps/web` per ADR‑0001. This worker is not a production cutover; ADR‑0007 governs a future Rust/Go service.

Environment variables:

- `INGESTION_WORKER_ENABLED`: `"true"` to run (default disabled)
- `RABBIT_URL`: RabbitMQ connection string

Notes:

- `failure_details` are redacted before persistence (ADR‑0012).
- Transient processing errors are retried with short exponential backoff prior to DLQ handoff.


