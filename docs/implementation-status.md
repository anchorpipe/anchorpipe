# Implementation status

Updated: 2026-10-02

## Implemented in the first vertical slice

- **Framework decision:** retained Next.js 16, Nx, TypeScript, and Prisma. No NestJS migration was introduced because it would add a second HTTP convention without fixing the actual durability and tenancy blockers.
- **Framework-neutral core:** `@anchorpipe/ingestion` now owns the versioned envelope vocabulary, stable error codes, exact-byte SHA-256 hashing, bounded JSON validation, and receipt/outbox ports without importing Next APIs.
- **Database foundation:** added an expand-only Prisma migration for `Tenant`, tenant-aware receipt metadata, evolved idempotency fields, `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, and `DeadLetter`. Existing migration history was not rewritten.
- **Versioned API adapter:** added `POST /api/v1/ingestions`, requiring `Idempotency-Key`, JSON, HMAC authentication, server-derived repository tenant assignment, object storage before database acceptance, and `202` only after receipt/idempotency/outbox persistence.
- **Status API:** added tenant/repository-authorized `GET /api/v1/ingestions/{ingestionId}` with stable not-found and service-unavailable errors.
- **Worker boundary:** replaced the source-less ingestion worker scaffold with a real PostgreSQL outbox worker target. Until normalization exists, it explicitly quarantines accepted receipts as `NORMALIZATION_NOT_IMPLEMENTED`; it never claims successful parsing/scoring.
- **Quality plumbing:** registered an explicit ingestion-library test/build target, fixed the invalid Nx Next lint executor, minimized the lockfile change, and added contract unit tests.

## Validation completed

- `npm ci --ignore-scripts --dry-run --no-audit --no-fund`
- Prisma client generation
- Prisma schema validation
- `@anchorpipe/ingestion` unit tests: 3 passing
- `@anchorpipe/ingestion` TypeScript build
- ingestion worker TypeScript build
- web TypeScript check
- web lint target
- `git diff --check`

## Deliberate limitations / next gates

This is **not yet production-ready**. The first slice still needs service-backed acceptance before it can be called durable:

1. Run the migration against an empty database and a representative legacy database with an explicit repository-to-tenant mapping.
2. Add PostgreSQL concurrency tests for same-key replay, hash conflict, rollback, and one-receipt/one-outbox invariants.
3. Add real object-storage tests for digest, private prefixes, retry, and orphan cleanup.
4. Replace legacy repo-ID Bearer credentials with opaque key IDs/secrets, freshness, nonce/delivery replay protection, and atomic rotation ownership checks.
5. Add deployed-role tenant/RLS denial tests and worker ownership re-checks.
6. Implement the report normalizer and replace the explicit quarantine path with canonical facts, while preserving provenance and warnings.
7. Add worker lease expiry, transient backoff, and operator-authorized replay/DLQ tests.
8. Make the CI service matrix run these tests against disposable PostgreSQL and object storage.

Until these gates pass, the new endpoint is an implementation branch of the redesign, not a production support promise.
