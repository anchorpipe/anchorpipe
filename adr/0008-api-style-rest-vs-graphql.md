# ADR-0008: API Style — REST-first; GraphQL for Aggregates (If Justified)

- Status: Proposed
- Date: 2025-10-21

## Context

- REST aligns with Next/Vercel and simpler caching; dashboard aggregates may suffer N+1/overfetch.

## Decision

- REST-first for all services.
- Consider GraphQL only for aggregate dashboard queries if measurable benefits (reduced overfetch/N+1, latency) are demonstrated.

## Consequences

- Keeps contracts simple; avoids premature complexity.

## Alternatives considered

- GraphQL-first (heavier infra/complexity).

## Revisit criteria

- Aggregation endpoints show persistent inefficiency even after REST optimizations.

## References

- Architecture §5; UI/UX data needs.
