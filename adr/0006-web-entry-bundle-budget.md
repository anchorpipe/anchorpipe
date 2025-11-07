# ADR-0006: Web Entry Bundle Budget <100KB gz

- Status: Proposed
- Date: 2025-10-21

## Context

- PRD elevates bundle budget to 100KB gz (stricter than default 150KB).

## Decision

- Enforce <100KB gz for entry bundle.
- Exceptions require ADR: rationale, measurement, and rollback plan.
- Techniques: RSC-first, route-level code splitting, dynamic imports, tree-shaking, font/image optimization.

## Consequences

- Tighter guardrails; may defer some libraries to later gates.

## Alternatives considered

- 150KB default (less pressure on perf).

## Revisit criteria

- Proven user-impact if exceeding budget; validated trade-offs.

## References

- UI/UX §Performance; PRD §6.1.
