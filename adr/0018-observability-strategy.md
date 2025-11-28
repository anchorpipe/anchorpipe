# ADR-0020: Observability Strategy

## Status

Accepted

## Date

2025-11-28

## Context

- Anchorpipe recently added rate limiting, idempotency, and cron cleanup. These features require telemetry to confirm effectiveness and diagnose incidents.
- Existing logging was inconsistent and metrics focused only on ingestion latency.
- CI/CD requires visibility into health endpoints, Redis usage, and queue throughput before promoting releases.

## Decision

Adopt a three-pillar observability plan:

1. **Logging**
   - All server modules use the shared `logger` (`@/lib/server/logger`) which injects timestamps and request IDs.
   - Structured objects are logged instead of concatenated strings to ease parsing (e.g., `logger.info('SIEM forwarding completed', { total, success, failed })`).
   - Security-sensitive logs (HMAC auth) redact secrets but include repo IDs for auditing.
2. **Metrics**
   - HTTP metrics captured via `httpRequestDurationMs` (Prometheus histogram) for `/api/status`, ingestion, and future critical routes.
   - Rate limit middleware exposes `X-RateLimit-*` headers while Redis counters power dashboards.
   - Background jobs (idempotency cleanup) log counts so they can be scraped via log-based metrics.
3. **Tracing / Telemetry**
   - `recordTelemetry` is used for high-value events (`api.status`, ingestion flows). Each event stores request IDs and durations for correlation.
   - While distributed tracing is not yet deployed, the ADR mandates propagating `x-request-id` so later adoption of OTEL is straightforward.

## Alternatives Considered

1. **Rely solely on third-party APM** – rejected due to cost and the need for on-prem/self-hosting flexibility.
2. **Custom logging per module** – rejected as it reintroduces inconsistency.

## Consequences

### Positive

- Operators can correlate rate limit responses, ingestion outcomes, and cron jobs via shared IDs.
- Metrics feed into alerts (e.g., ingestion latency spikes, failed SIEM forwarding) without per-team instrumentation.
- Documentation for rate limiting, idempotency, and testing now references observability hooks so new contributors follow the pattern.

### Negative

- Additional maintenance to ensure new modules emit metrics.
- Slight performance overhead from logging/metrics, mitigated by batching and async logging.

## Implementation

- Ensure middleware, ingestion route, SIEM forwarder, and GitHub App service log structured objects with `requestId`.
- Expand Prometheus metrics in future milestones to include queue depth and Redis latency.
- Track these decisions in the new architecture guides so docs, tests, and ADRs stay aligned.
