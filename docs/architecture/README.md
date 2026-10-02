# Target architecture

## Architectural decision

Use a **modular monolith plus workers**. Keep API, authentication, configuration, and read projections in one control-plane application while domain boundaries are still changing. Move bursty normalization, feature extraction, scoring, and notifications behind durable asynchronous jobs. Extract services only after measured ownership, scaling, or isolation pressure justifies the cost.

This is not a commitment to microservices or event sourcing. PostgreSQL is the operational source of truth; Redis is optional and non-authoritative.

## Modules

1. **API/auth** — tenant derivation, RBAC, ingestion, status, and read APIs.
2. **Ingestion boundary** — envelope validation, credential verification, idempotency, raw evidence receipt, and receipt/outbox transaction.
3. **Provider adapters** — GitHub Actions artifact resolver first; future providers behind a versioned interface.
4. **Report adapters** — JUnit, Jest, Pytest, and Playwright with secure limits and warnings.
5. **Normalization** — canonical identities, parser warnings, provenance, and failure signatures.
6. **Attempt/features** — immutable execution metadata and derived experiment features.
7. **Scoring** — sequential statistical detector, transparent heuristics, and a future model registry.
8. **Read projections** — current run/test/finding views with freshness timestamps.
9. **Publisher** — one idempotent GitHub Check Run; comments are out of v1.
10. **Operations** — outbox relay, retries/DLQ, replay, retention, audit, metrics, and traces.

## Data flow

```text
CI / CLI / GitHub artifact
          |
          v
 authenticate + authorize + validate envelope
          |
          +--> stream raw bytes --> private object storage (hash + retention)
          |
          +--> PostgreSQL transaction:
                 receipt + idempotency claim + outbox event
                           |
                    return 202 + ingestion_id
                           |
                           v
             worker: normalize -> features -> aggregate -> score -> notify
                           |
                           +--> canonical facts and projections
                           +--> idempotent Check Run outbox
                           +--> audit and telemetry
```

The request path must not parse or score reports. The receipt and outbox transaction commits before acknowledgement. At-least-once delivery is the contract; relay and consumer duplicates are expected and must be harmless.

## Canonical domain model

The existing `TestCase`, `TestRun`, and `FlakeScore` structures should become compatibility projections over these facts:

- `Tenant` / `Organization`: owner, lifecycle, quotas, policy, and retention defaults.
- `Repository`: immutable provider ID plus historical names.
- `TestDefinition`: repository, stable adapter-normalized key, and framework.
- `Commit` and `RefSnapshot`: immutable object identity and observed ref/branch.
- `Run`, `Job`, `Shard`, `SuiteExecution`: logical CI hierarchy.
- `Attempt` and `TestExecution`: numbered retries, ordinal, status, duration, and evidence links.
- `EnvironmentSnapshot`: OS/image/runtime/tool versions, lock hash, locale/timezone, flags, and dependency digest; never secrets.
- `FailureSignature`: versioned category, exception type, normalized-message hash, top-frame hash, assertion diff, and infrastructure dimensions.
- `Evidence` / `EvidenceLink`: content-addressed object metadata, SHA-256, media type, size, redaction version, and source execution.
- `Finding` / `FindingEvent`: derived or reviewed assertion, detector/policy version, evidence window, reviewer, and append-only changes.
- `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, `IdempotencyKey`, and `DeadLetter`.

## Invariants

- Raw facts are append-only; corrections are compensating events.
- Derived scores declare algorithm, window, policy, and input attempt IDs.
- Source and observed timestamps are UTC and retained separately.
- Conflicting replays are quarantined.
- Evidence is redacted before analytics and tenant-isolated.
- Branch names never replace commit SHAs.
- Deletion removes blobs, indexes, credentials, and derived data subject to legal holds; immutable audit history follows an approved retention policy.

## Storage

- **PostgreSQL:** receipts, canonical facts, identities, policies, projections, scores, audit, outbox, and processing ledger.
- **Private object storage:** raw reports, logs, screenshots, and traces addressed by tenant/repository/run/digest with lifecycle classes.
- **Redis/Valkey:** cache and rate limiter only; never ingestion durability.
- **Analytics lake:** defer Parquet/Iceberg until measured volume or replay needs justify it.

The first hosted reference is one stateless web/API container, one worker, managed PostgreSQL, managed S3-compatible storage, and optional managed Redis. RabbitMQ, MinIO clusters, Kubernetes, and Terraform matrices remain adapters or future profiles, not default requirements.
