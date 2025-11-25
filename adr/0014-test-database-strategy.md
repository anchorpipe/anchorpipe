# ADR-0014: Test Database Strategy

- Status: Accepted
- Date: 2025-11-24

## Context

Automated tests now run on every pull request, and many suites depend on Prisma/PostgreSQL interactions. We need a deterministic, isolated database strategy that mirrors production schemas without polluting developer machines or leaving behind stale state between CI runs.

## Decision

- Use **PostgreSQL 16** (same engine as production) for the shared test database.
- Apply migrations via `prisma migrate deploy` before each test run (fresh schema each time).
- Use connection string `postgresql://postgres:postgres@localhost:5432/anchorpipe_test`.
- Keep teardown simple by dropping/recreating the database in CI containers; local runs can reuse the same DB since migrations reset the schema.

This corresponds to **Option A (fresh migrations per run)** which prioritizes correctness over absolute speed.

### Implementation

- CI job provisions postgres:16-alpine, runs migrations, executes `nx test web --coverage`.
- Local developers can run `docker compose up db` (port 5432) and rely on `npm run test`.
- Cleanup strategy: CI containers are ephemeral; local developers can run `psql -c "DROP DATABASE anchorpipe_test"` if necessary, but migrations keep tables clean.

## Consequences

### Positive

- Guarantees schema parity with production.
- Keeps tests deterministic—no leftover rows between runs.
- Simplifies developer onboarding (no custom seed scripts required).

### Negative

- Slightly slower test start time because migrations run before every suite.
- Requires PostgreSQL to be available locally even for predominantly unit-level tests.

### Mitigations

- Limit migrations to deploy-only (no `migrate dev`) to keep them fast.
- Future work: introduce lightweight SQLite harness for pure unit tests if runtime becomes a bottleneck.

## Alternatives Considered

1. **Seeded persistent DB (Option B)** – Faster but risks flaky tests due to stale data. Rejected.
2. **Hybrid SQLite + PostgreSQL (Option C)** – Adds complexity in maintaining multiple ORM targets. Revisit if suites slow down significantly.

## References

- Prisma Testing Guide: https://www.prisma.io/docs/guides/testing
- CI workflow: `.github/workflows/ci.yml` (tests job)
