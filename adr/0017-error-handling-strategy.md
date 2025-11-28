# ADR-0019: Error Handling Strategy

## Status

Accepted

## Date

2025-11-28

## Context

- Anchorpipe now exposes multiple public APIs (ingestion, health, admin) backed by distributed services.
- Prior incident reviews highlighted inconsistent error formats (`{ error: string }`, `{ message: string }`, raw text) that complicated observability and client handling.
- Service layer code used ad-hoc `console.error` blocks without correlation IDs, making it difficult to trace failures to originating requests.
- A clear strategy is required to guarantee predictable API responses, graceful degradation, and actionable logging.

## Decision

Anchorpipe adopts a tiered error handling model:

1. **API Layer**
   - All API handlers return JSON envelopes of the form `{ error: string }` or `{ error: { code, message } }`.
   - Status codes follow HTTP semantics: `4xx` for client issues, `5xx` for service failures. Health endpoints use `503` when dependencies degrade.
   - Integration points (middleware, ingestion route) include `x-request-id` headers so clients can reference support logs.
2. **Service Layer**
   - Services throw typed errors (e.g., `RateLimitError`, `ValidationError`) instead of `any`. APIs translate these to user-facing payloads.
   - When an operation can fail without blocking the request (telemetry inserts, queue publishing), services swallow the error after logging WARN-level entries to keep user workflows running.
3. **Graceful Degradation**
   - Middleware fails open when Redis is unavailable, prioritizing availability over strict enforcement.
   - Idempotency and rate limiting log duplicates/errors but still return `200` when safe results exist.

## Alternatives Considered

1. **Propagate library errors directly** – rejected: leaks internal details and produces inconsistent responses.
2. **Global try/catch middleware only** – rejected: harder to guarantee context-aware responses per route; some handlers need domain-specific payloads.

## Consequences

### Positive

- Clients can rely on a single JSON schema for errors, reducing custom handling.
- Logs capture request IDs and structured metadata, enabling faster debugging.
- Services maintain graceful behavior (skip queue publish, ignore duplicate inserts) without crashing user flows.

### Negative

- Developers must maintain typed error classes and remember to translate them at the API layer.
- Additional tests are required to ensure new handlers respect the envelope.

## Implementation

- Standardize helper functions in route modules (`createAuthErrorResponse`, etc.).
- Add Vitest coverage for authentication failures, validation errors, and idempotency fallbacks.
- Document patterns in `docs/guides/architecture/testing.md` and `docs/guides/architecture/idempotency.md`.
