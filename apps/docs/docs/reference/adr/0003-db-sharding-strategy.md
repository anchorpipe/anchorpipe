---
id: db-sharding-strategy
sidebar_position: 1
---

# ADR-0003: Database Sharding Strategy and Timing

- Status: Proposed
- Date: 2025-10-21

## Context

- Postgres is primary store; growth may require partitioning/sharding.
- Hot paths: TestRun (time-series), FlakeScore (per test-case), per-repo queries.

## Decision

- Phase 1: Optimize via indexing, partial indexes, FKs, connection pooling, partitioning (by time) where suitable.
- Phase 2: Consider Citus (distributed Postgres) or logical sharding by repo_id and time.
- Choose shard key: primary (repo_id), secondary (time) for large tables.

## Consequences

- Delay complexity until signals justify.
- Requires shard-aware queries and migration plan.

## Alternatives considered

- Early Citus from day one; multiple independent databases per tenant.

## Revisit criteria

- Write amplification; p95 query latency >100ms sustained on indexed queries; storage growth pressure; connection pool saturation.

## References

- PRD §6; Architecture §6.3.
