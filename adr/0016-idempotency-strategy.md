# ADR-0016: Idempotency Strategy for Ingestion API

## Status

Accepted

## Date

2025-11-28

## Context

- The `/api/ingestion` endpoint currently queries the 50 most recent `TelemetryEvent`
  rows to guess whether a submission is a duplicate. This is race-prone and scales
  poorly once repositories ingest hundreds of runs per hour.
- Uniqueness today depends on matching `repoId`, `commitSha`, `runId`, and
  `framework`, but there is no durable record of processed requests nor caching of
  the API response.
- There is no automated cleanup, so any “stopgap” table would eventually grow
  without bounds unless we enforce a TTL.
- CI retry behavior requires deterministic idempotency semantics with ACID
  guarantees (duplicate requests should return the original success response).

## Decision

We will back ingestion idempotency with a dedicated `idempotency_keys` table and a
Next.js service layer that enforces the key contract before work is queued.

### Idempotency Key Format

`{repositoryId}:{commitSha}:{runId|'no-run-id'}:{framework}`

### TTL

- 24 hours (configurable constant). This covers typical CI retries and limits table
  growth.

### Response Caching

- Cache only successful ingestion responses. Failed submissions should retry
  immediately without waiting for TTL expiry.

### Cleanup Strategy

- Hourly GitHub Actions workflow that calls `/api/cron/cleanup-idempotency`.
- The route deletes expired rows and logs the count for observability.

### Backwards Compatibility

- Remove the legacy `checkDuplicateIngestion` helper that queried telemetry events.
- The new service fully replaces the old logic; there is no fallback.

## Alternatives Considered

1. **Keep querying `TelemetryEvent`** – insufficient under concurrency and lacks
   cached responses. ❌
2. **Redis-based cache** – not durable enough for audit/compliance; adds another
   dependency to ingestion path. ❌
3. **Message queue deduplication** – happens too late (after we already enqueue
   duplicates) and complicates RabbitMQ topology. ❌

## Consequences

### Positive

- ACID guarantees on idempotency checks via PostgreSQL unique constraint.
- Cached responses give deterministic behavior for retried CI jobs.
- Hourly cleanup keeps the table bounded while satisfying compliance retention.

### Negative

- Additional Prisma model/table plus migrations to maintain.
- Requires cron secret/config management (`CRON_SECRET`, workflow call, monitoring).

## Implementation

- `libs/database/prisma/schema.prisma`: `IdempotencyKey` model + repo relation.
- `apps/web/src/lib/server/idempotency-service.ts`: helper to generate keys, check,
  record, and clean them (24 h TTL, fail-open logging).
- `apps/web/src/lib/server/ingestion-service.ts`: call the service before/after
  processing and delete the old duplicate logic.
- `apps/web/src/app/api/cron/cleanup-idempotency/route.ts`: cron endpoint invoked
  hourly via `.github/workflows/cleanup-idempotency.yml`.
- `.env.example`: `CRON_SECRET` placeholder for the workflow.
- Tests covering the new service and ingestion integration (`vitest` suites).

## References

- HTTP Idempotency draft: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header
- Stripe Idempotency docs: https://stripe.com/docs/api/idempotent_requests

