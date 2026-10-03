# Implementation status

Updated: 2026-10-03

## Implemented in the first vertical slice

- **Framework decision:** retained Next.js 16, Nx, TypeScript, and Prisma. No NestJS migration was introduced because it would add a second HTTP convention without fixing the actual durability and tenancy blockers.
- **Framework-neutral core:** `@anchorpipe/ingestion` now owns the versioned envelope vocabulary, stable error codes, exact-byte SHA-256 hashing, bounded JSON validation, and receipt/outbox ports without importing Next APIs.
- **Database foundation:** added an expand-only Prisma migration for `Tenant`, tenant-aware receipt metadata, evolved idempotency fields, `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, and `DeadLetter`. Existing migration history was not rewritten.
- **Versioned API adapter:** added `POST /api/v1/ingestions`, requiring `Idempotency-Key`, JSON, HMAC authentication, server-derived repository tenant assignment, object storage before database acceptance, and `202` only after receipt/idempotency/outbox persistence.
- **Status API:** added tenant/repository-authorized `GET /api/v1/ingestions/{ingestionId}` with stable not-found and service-unavailable errors.
- **Worker boundary:** replaced the source-less ingestion worker scaffold with a real PostgreSQL outbox worker target. Until normalization exists, it explicitly quarantines accepted receipts as `NORMALIZATION_NOT_IMPLEMENTED`; it never claims successful parsing/scoring.
- **Quality plumbing:** registered an explicit ingestion-library test/build target, fixed the invalid Nx Next lint executor, minimized the lockfile change, and added contract unit tests.
- **Canonical normalization primitive:** added a framework-neutral normalizer for parsed JUnit, Jest, pytest, Playwright, Mocha, and Vitest cases. It preserves raw parsed provenance, emits deterministic canonical statuses, and retains malformed records as `unknown` with warnings rather than dropping them.
- **Worker reliability:** added PostgreSQL-backed processing leases, stale-lease recovery, bounded exponential retry, maximum-attempt handling, compare-and-set ownership checks, and explicit dead-letter/quarantine transitions. Normalization remains injectable; the default still quarantines until a parser-to-normalizer adapter is wired.
- **Replay-resistant credentials:** added strict v1 HMAC signatures bound to key ID, timestamp, nonce, and body digest. The v1 POST and status endpoints use the hardened verifier; the legacy endpoint retains an explicitly named compatibility verifier.
- **Focused service-boundary tests:** added transaction-mock tests for idempotent replay, hash conflict, tenant authorization, and atomic rollback, plus API tests for request validation, status scoping, duplicate responses, and service failures.
- **CI quality workflow:** added a deployment-free GitHub Actions workflow covering Prisma validation, ingestion tests, worker build, web type-check/lint, and a deliberately informational npm audit baseline. The audit baseline reports unresolved vulnerabilities; it does not claim remediation.

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
- v1 HMAC/auth/API/adapter suites: **31 passing tests**
- normalizer and worker suites: **10 passing tests**

## Deliberate limitations / next gates

This is **not yet production-ready**. The first slice still needs service-backed acceptance before it can be called durable:

1. Run the migration against an empty database and a representative legacy database with an explicit repository-to-tenant mapping.
2. Add PostgreSQL concurrency tests for same-key replay, hash conflict, rollback, and one-receipt/one-outbox invariants.
3. Add real object-storage tests for digest, private prefixes, retry, and orphan cleanup.
4. Replace the process-local replay store with a shared atomic Redis/database implementation and add key-rotation lifecycle APIs; the v1 wire format and verification path now exist, but multi-instance replay protection is not complete.
5. Add deployed-role tenant/RLS denial tests and worker ownership re-checks.
6. Wire the canonical normalizer to the existing raw-report parsers and replace the explicit quarantine path with canonical facts, while preserving provenance and warnings.
7. Add operator-authorized replay/DLQ APIs and live lease/retry tests against PostgreSQL.
8. Make the CI service matrix run these tests against disposable PostgreSQL and object storage; the current workflow is a quality-gate baseline without external services.

Until these gates pass, the new endpoint is an implementation branch of the redesign, not a production support promise.
