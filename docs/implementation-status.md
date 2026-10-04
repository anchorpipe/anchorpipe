# Implementation status

Updated: 2026-10-03

## Implemented in the redesigned vertical slice

- **Framework decision:** retained Next.js 16, Nx, TypeScript, and Prisma. No NestJS migration was introduced because it would add a second HTTP convention without fixing the actual durability and tenancy blockers.
- **Domain-focused backend services:** renamed service boundaries to clean domain names (`ingestion-collector`, `normalizer`, `contracts`, `workspace`) under `services/`, completely removing language-specific (`-rust`) naming.
- **Legacy worker removal:** retired obsolete/duplicate TypeScript ingestion worker (`services/ingestion`) and updated workspace build targets, `.prettierignore`, and CI scripts.
- **Framework-neutral core:** `@anchorpipe/ingestion` owns the versioned envelope vocabulary, stable error codes, exact-byte SHA-256 hashing, bounded JSON validation, and receipt/outbox ports.
- **Database foundation:** added an expand-only Prisma migration for `Tenant`, tenant-aware receipt metadata, evolved idempotency fields, `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, and `DeadLetter`.
- **Versioned API adapter:** `POST /api/v1/ingestions` requiring `Idempotency-Key`, JSON, HMAC authentication, server-derived repository tenant assignment, object storage before database acceptance, and `202` only after receipt/idempotency/outbox persistence.
- **Status API:** added tenant/repository-authorized `GET /api/v1/ingestions/{ingestionId}` with stable error contracts.
- **Parser to Normalizer Pipeline:** added `normalizeRawTestReport` pipeline in `apps/web/src/lib/server/test-report-parsers/pipeline.ts` integrating raw report framework parsers (JUnit, Jest, PyTest, Playwright) directly with canonical test normalization models.
- **Atomic Multi-Instance Replay Protection:** added `DistributedRedisReplayStore` using atomic Redis nonce operations (`checkAndSetNonce`) and wired it into `hmac-auth.ts` for multi-instance HMAC replay prevention.
- **Operator DLQ & Processing Ledger APIs:** added operator-authorized management endpoints (`/api/v1/admin/dead-letters` and `/api/v1/admin/dead-letters/[id]/replay`) with transaction-backed outbox re-queueing, audit logs, and RBAC authorization.
- **CLI DLQ Utility:** created `scripts/dlq-manage.ts` CLI tool for operators to list, inspect, replay, and purge dead-lettered ingestion entries.
- **Worker reliability:** added PostgreSQL-backed processing leases, stale-lease recovery, bounded exponential retry, maximum-attempt handling, compare-and-set ownership checks, and explicit dead-letter transitions.
- **Replay-resistant credentials:** added strict v1 HMAC signatures bound to key ID, timestamp, nonce, and body digest with key-rotation management endpoints (`/api/admin/hmac-secrets`).
- **Backend Services CI:** added `.github/workflows/backend-services.yml` running Cargo format, check, test, and `cargo audit` dependency validation against the `services/workspace` Cargo workspace.

## Validation completed

- `npm ci --ignore-scripts --dry-run --no-audit --no-fund`
- Prisma client generation and schema validation
- `@anchorpipe/ingestion` unit tests and TypeScript build
- Backend Cargo workspace checks and unit tests (`cargo test --workspace` inside `services/workspace`)
- Next.js web build (`DATABASE_URL=... npm run build`)
- Web linting (`npm run lint`)
- Vitest suite passing 102 test files and 602 tests (`npm test`)

## Completed architectural gates

1. Clean domain service naming without language suffixes (`ingestion-collector`, `normalizer`, `contracts`, `workspace`).
2. Multi-instance atomic replay protection via Redis (`DistributedRedisReplayStore`).
3. Parser-to-normalizer pipeline (`normalizeRawTestReport`).
4. Operator DLQ management APIs and CLI utility (`scripts/dlq-manage.ts`).
5. GitHub Actions CI workflow for workspace services (`.github/workflows/backend-services.yml`).
