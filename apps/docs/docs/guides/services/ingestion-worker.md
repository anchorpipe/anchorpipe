---
sidebar_position: 1
sidebar_label: 'Ingestion Worker (GB dev helper)'
---

# Ingestion Worker (GB dev helper)

## Scope and purpose

The ingestion worker in `services/ingestion` is a development‑only consumer that validates asynchronous processing of test ingestion events, retry behavior, and DLQ routing during Gate B (EPIC‑001).

Per ADR‑0001, the public ingress remains the Next.js Route Handler under `apps/web`. ADR‑0007 will govern any future cutover to a dedicated Rust/Go ingestion service for production.

## Enabling the worker

Set the following environment variables (defaults keep it disabled):

```bash
INGESTION_WORKER_ENABLED=true
RABBIT_URL="amqp://guest:guest@localhost:5672"
```

## Behavior

- Consumes messages from `test.ingestion`.
- Upserts `TestCase` by (`repoId`, `path`, `name`, `framework`) and persists `TestRun` rows.
- Applies short in‑process exponential retry before NACK to allow DLQ routing.
- Redacts `failure_details` prior to persistence (ADR‑0012).

## Metrics and logs

- In‑process `prom-client` counters:
  - `ingestion_messages_ingested_total`
  - `ingestion_messages_failed_total`

## Tests

- Unit tests for API‑layer ingestion live under `services/ingestion/tests` (temporarily colocated for convenience during GB). They exercise idempotency and metadata persistence paths via the web ingestion service.

## Notes

- Keep this worker disabled by default and behind env flags in developer machines.
- For production‑grade ingestion, see ADR‑0007 (cutover criteria) and plan for a Rust/Go replacement with streaming parsers and dedicated observability.
