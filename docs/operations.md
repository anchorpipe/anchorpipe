# Operations

## Supported profiles

### Local

Docker Compose is for development: PostgreSQL plus disposable Redis/MinIO or an equivalent local object store. Bind services to localhost/private networks, generate development secrets, pin image versions, and add health checks and resource limits. Development credentials must never be reused in hosted environments.

### Hosted reference

The first supported hosted profile is one stateless web/API container, one worker, managed PostgreSQL, managed S3-compatible object storage, and optional managed Redis/Valkey. PostgreSQL is the operational source of truth. Redis is disposable cache/rate-limit state, not ingestion durability.

### Self-hosted

Support Compose first. Kubernetes/Helm, Terraform matrices, RabbitMQ clusters, and MinIO clusters are future profiles requiring demand, an owner, tested upgrades, backups, restores, and rollback evidence.

## Reliability targets

These are proposed targets, not observed performance:

- 99.5% monthly availability for authenticated API/UI requests;
- p95 non-ingestion read latency below 500 ms;
- 99% successful accepted-ingestion responses;
- 99% of accepted jobs started within five minutes;
- no unacknowledged backup/restore test older than 90 days.

Define exclusions and measure from the edge through worker outcomes. Use error budgets to decide when to stop feature work and pay down reliability debt.

## Observability

Instrument request rate/error/latency, database pools, object-store errors, queue age/retries/DLQ, ingestion freshness, worker saturation, provider rate limits, and tenant quota abuse. Include correlation IDs and bounded labels; never use raw tenant names, test names, paths, or secrets as unbounded metric labels.

Alert on SLO burn rate, queue age, dead letters, database/WAL/storage pressure, backup freshness, and quota abuse. Separate readiness from liveness. Use graceful shutdown, worker lease renewal, bounded jittered retries, circuit breakers, resource limits, and replayable logs.

## Backup and recovery

Managed PostgreSQL PITR requires base backups plus continuous WAL archiving. Object storage needs versioning/lifecycle policy and encrypted copies where required. Self-hosted deployments need off-host immutable archives, key recovery, and restore verification.

Run restore drills at least quarterly. Record RPO/RTO evidence, schema/migration compatibility, object-store recovery, queue replay, tenant offboarding, and credential rotation. A backup that has never been restored is not an operational guarantee.

## Release gate

A release requires a clean checkout to pass:

1. lockfile-enforced dependency installation and bounded vulnerability policy;
2. Prisma generation and empty-database migration;
3. typecheck/build for all supported applications, libraries, and workers;
4. lint with compatible pinned tools;
5. unit tests with no unexplained skips;
6. PostgreSQL/object-storage service-backed integration tests;
7. API, webhook, and security negative tests;
8. non-root container build/start/smoke test;
9. license, provenance, and SBOM scan;
10. source-archive build/install test.

A release identifies an immutable commit, dependency/provenance inventory, checksums, source archive, and build evidence. Hosted deployment is not a project guarantee until an owner, rollback, backup/restore evidence, and measured SLO exist.

## Current blockers

The research found clean-build and lint risk, incomplete worker source, ingestion durability gaps, a fake-success Check Run path, missing route-level rate-limit enforcement, unauthenticated metrics, race-prone password reset, incomplete retention execution, and mostly unit/mocked test coverage. These are release blockers, not documentation polish.
