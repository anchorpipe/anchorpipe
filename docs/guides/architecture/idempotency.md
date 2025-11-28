# Idempotency Architecture

## Overview

CI systems often retry ingestion when jobs fail. To prevent duplicate processing we persist every request in the `IdempotencyKey` table (`libs/database/prisma/schema.prisma`) and short‑circuit subsequent submissions.

- Key format: `{repoId}:{commitSha}:{runId|'no-run-id'}:{framework}`
- TTL: 24 hours (configurable via `IDEMPOTENCY_TTL_HOURS` constant)
- Storage: PostgreSQL table `idempotency_keys` with unique constraint on `key`
- Cached response: JSON copy of the successful ingestion response so duplicates can return instantly

`apps/web/src/lib/server/idempotency-service.ts` exposes helpers to generate keys, check duplicates, persist responses, and cleanup expired entries.

## Request Flow

1. Route authenticates the request, extracts repo ID, and validates payload.
2. `processIngestion` calls `checkIdempotency`. If a matching row exists and is still valid, the cached payload (if any) is returned with `isDuplicate: true`.
3. After successful ingestion, `recordIdempotency` stores the response JSON plus expiration timestamp.
4. A GitHub Actions cron job (`.github/workflows/cleanup-idempotency.yml`) hits `/api/cron/cleanup-idempotency` hourly to delete expired rows.

## Testing

- Unit tests at `apps/web/src/lib/server/__tests__/idempotency-service.test.ts` cover generation, duplicate detection, TTL deletion, cleanup failures, and serialization.
- Integration tests at `apps/web/src/app/api/ingestion/__tests__/ingestion.integration.test.ts` verify duplicate requests surface `isDuplicate: true`.
- Run focused tests: `npm run test:web -- idempotency-service ingestion-service`.

## Operations

- TTL adjustments: change `IDEMPOTENCY_TTL_HOURS` and re-run cron to enforce new retention.
- Cleanup: `/api/cron/cleanup-idempotency` requires `CRON_SECRET` in both `.env` and GitHub Actions secrets.
- Database considerations: table is indexed by `key`, `repoId`, `commitSha`, and `expiresAt` for efficient lookups and cleanup.

## Troubleshooting

| Issue | Action |
| --- | --- |
| Duplicate still processed | Confirm payload normalization (run IDs trimmed). Logs will include `[Idempotency] check failed` if DB issues occur. |
| Table grows unexpectedly | Ensure cleanup cron job is succeeding (GitHub Actions workflow + logs in `/api/cron/cleanup-idempotency`). |
| Cached response invalid | `serializeToJsonValue` normalizes responses before storage. If response shape changes, update serialization tests. |***

