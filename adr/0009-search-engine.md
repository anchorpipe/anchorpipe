# ADR-0009: Search Engine — Postgres FTS + Trigram (MVP)

- Status: Proposed
- Date: 2025-10-21

## Context
- Global search/NLP ambitions vs. MVP simplicity.

## Decision
- MVP: Postgres FTS + pg_trgm indexes for fuzzy search.
- Revisit Typesense/Meilisearch at Gate C when usage or query complexity justifies.

## Consequences
- Minimal extra infra; acceptable search for MVP.

## Alternatives considered
- Dedicated search service now (more ops).

## Revisit criteria
- Latency/quality issues with FTS; advanced NLP needs.

## References
- UI/UX §8.3; PRD §5.4.
