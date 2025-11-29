---
id: messaging-selection
sidebar_position: 1
---

# ADR-0002: Messaging Selection (RabbitMQ MVP; Kafka/Redpanda Revisit)

- Status: Proposed
- Date: 2025-10-21
- Deciders: anchorpipe Core Program (rick1330)

## Context

- Asynchronous processing decouples ingestion from scoring and bot notifications.
- Operability matters for MVP; scalability matters for Gate C/D.

## Decision

- MVP: RabbitMQ on Render for operational simplicity.
- Provide a thin queue adapter interface to avoid lock-in.
- Revisit Kafka/Redpanda when throughput ≥100k runs/hour or multi-tenant scale requires durable streams.

## Consequences

- Faster MVP; simpler ops and tooling.
- Future migration path documented; adapter limits direct use of vendor-specific features.

## Alternatives considered

- Kafka first (overhead for MVP); SQS-only (limited portability; differs across clouds).

## Revisit criteria

- Throughput ≥100k runs/hour sustained, multi-tenant backlog pressure, need for stream retention/replay, partition scaling.

## References

- PRD §5.1; Research §7.1; Architecture Containers.

