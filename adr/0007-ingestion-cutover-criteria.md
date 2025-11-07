# ADR-0007: Ingestion Cutover Criteria (Rust/Go on Render)

- Status: Proposed
- Date: 2025-10-21

## Context
- MVP can start with Next.js Route Handlers for small payloads; need triggers for cutover.

## Decision
- Cut over to dedicated Rust/Go ingestion on Render when any:
  1) p95 ingest latency >500ms for payloads ≥10MB for 3 consecutive days, or
  2) sustained throughput ≥100k runs/hour, or
  3) persistent cold-start/CPU/mem SLO breaches for 24h.

## Consequences
- Predictable migration point; preserves MVP velocity.

## Alternatives considered
- Preemptive ingestion service (slower MVP).

## Revisit criteria
- Observability signals show earlier pain; or Vercel limits change.

## References
- PRD §4.2, §5.1; Architecture §8; Research §7.
