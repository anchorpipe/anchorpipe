# Roadmap and gap register

This roadmap is a sequence of gates, not a promise of dates. A phase stops when its evidence is missing.

## Phase 0 — Inventory and decisions

Deliver the behavior matrix, legal/provenance inventory, threat model, schema/event decisions, v1 contract, baseline metrics, and cleanup plan. Stop if copyright authority, historical license boundaries, or tenant authority cannot be established.

## Phase 1 — Honest repository foundation

Make an empty checkout install, generate Prisma, migrate an empty database, build, lint, test, and run the supported local profile. Pin compatible tools/images, define environment profiles, redact API errors, and remove fictional worker/provider claims.

**Gate:** clean build/lint/test/container pass with no critical unreviewed dependency exception.

## Phase 2 — Security and tenancy

Add `Tenant`, immutable provider IDs, centralized authorization, RLS/equivalent, opaque CI credentials, webhook replay protection, route rate limits, protected metrics, atomic password resets with session invalidation, audit retention, and log redaction.

**Gate:** cross-tenant denial suite, replay suite, secret/PII log scan, key-rotation drill, and threat-model review.

## Phase 3 — Durable ingestion and canonical facts

Add `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, `DeadLetter`, evidence storage, a versioned envelope, canonical Run/Attempt/TestExecution facts, and a worker loop. Keep RabbitMQ optional behind an adapter; PostgreSQL-backed jobs are acceptable initially.

**Gate:** receipt durability under broker/object-storage failure, idempotent replay, crash recovery, malformed-artifact quarantine, and freshness metrics.

## Phase 4 — Evidence-first detector and v1 integrations

Implement same-condition sequential retries, Jeffreys/Wilson uncertainty, transparent heuristics, perturbation hooks, JUnit plus existing JSON adapters, GitHub artifact retrieval, and one stable Check Run.

**Gate:** benchmark meets the agreed precision/false-quarantine budget, parser security tests pass, GitHub sandbox acceptance passes, and unsupported paths never acknowledge false success.

## Phase 5 — Reference operations

Ship the hosted-reference profile, managed PostgreSQL/object storage, optional Redis, OpenTelemetry, SLO dashboards, PITR/restore drill, expand/contract migrations, release signatures/SBOM, and operator replay/retention runbooks.

**Gate:** staged soak meets proposed availability/latency/freshness targets and rollback/offboarding evidence exists.

## Phase 6 — Calibration and selective extraction

Build adjudication and benchmark data. Add calibrated models only when label volume/support is adequate. Consider Kafka, Iceberg, or service extraction only after measured replay, volume, or ownership pressure.

**Gate:** time-forward grouped evaluation, calibration, drift monitoring, abstention, per-repository performance, and explicit approval for automatic actions.

## Current forensic gaps

### P0 — release blockers

- Clean build depends on generated Prisma state and is not proven from an empty checkout.
- Tenant is not a first-class isolation boundary.
- Ingestion acknowledgement is not durably coupled to receipt/outbox state.
- The advertised ingestion worker is incomplete/scaffolded.
- The GitHub Check Run path contains a false-success/incomplete artifact path.
- CI upload authentication treats identifiers as credentials and needs rotation/freshness controls.
- Webhook delivery IDs are not durably deduplicated.
- Toolchain/security gates are not currently trustworthy.

### P1 — external-use blockers

- Route rate limiting is not consistently enforced.
- Metrics exposure needs authentication or network isolation.
- Password reset redemption is race-prone and does not fully invalidate sessions.
- Password-reset logs can contain submitted email PII.
- Retention is configuration without an evidenced DB/object/queue executor.
- Audit history can be deleted through cascading user deletion.
- Parsers need a provenance/evidence envelope and secure resource limits.
- Provider publication behavior must be reduced to one idempotent Check Run.

### P2 — operational debt

- Local Compose uses unsafe defaults, floating images, incomplete health checks, and port/documentation drift.
- Environment examples contain conflicting profiles.
- Service/docs paths describe absent or planned components as current.
- API errors can expose internal details.
- Existing test confidence is mostly unit/mocked; service-backed integration and E2E acceptance are missing.

## Definition of done for the redesign

The redesign is complete only when implemented behavior, tests, operations, and documentation agree. A document may describe a proposal, but it must not convert a planned component into a supported promise.
