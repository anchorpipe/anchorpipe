# ADR-0001: Core Backend Stack (MVP BFF via Next.js; Rust/Go for Ingestion/Scoring)

- Status: Proposed
- Date: 2025-10-21
- Deciders: anchorpipe Core Program (rick1330)

## Context

- MVP needs a lightweight API/BFF close to the web app for low-latency UI endpoints and PR previews.
- Ingestion and scoring have stringent performance/SLO requirements and benefit from compiled languages and async streaming parsers.

## Decision

- MVP API/BFF: Next.js Route Handlers on Vercel (REST-first).
- Performance-critical services: Rust or Go microservices (Ingestion, Scoring) off-Vercel when cutover criteria are met (see ADR-0007).
- Keep NestJS on Render as an option if complexity or cross-team contributions favor that framework for a future API gateway.

## Consequences

- Fast iteration and PR previews via Vercel; minimal ops for MVP.
- Clear separation of concerns: UI/BFF vs. data plane (ingestion/scoring).
- Introduces polyglot stack; requires interface contracts and shared types.

## Alternatives considered

- Single Next-only serverless approach (risks: cold starts, memory ceilings, large payloads).
- All-in NestJS (heavier ops cost; less alignment with Vercel-first web app).

## Revisit criteria

- BFF SLO breaches (latency, cold starts), complex orchestration needs, or heavy request fan-out demand a dedicated gateway.

## References

- PRD §§5.1–5.4; Architecture §§3–5; Research §7.1.
