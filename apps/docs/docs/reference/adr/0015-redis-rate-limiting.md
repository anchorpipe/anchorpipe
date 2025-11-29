---
id: redis-rate-limiting
sidebar_position: 1
---

# ADR-0015: Redis-Based Rate Limiting

## Status

Accepted

## Date

2025-11-25

## Context

The in-memory rate limiter under `apps/web/src/lib/server/rate-limit.ts` uses a `Map`
that only protects a single Node.js instance. Any horizontal scaling (multiple
Next.js API workers, edge nodes, or future Go/Rust ingestion services) bypasses the
limits entirely, making brute-force attempts, GitHub webhook floods, and CI
misconfigurations high risk. Redis already ships with the developer stack via
`infra/docker-compose.yml`, but no application code currently uses it. We need a
distributed rate limiter that delivers consistent enforcement, per-route
configuration, and operational visibility without sacrificing availability.

## Decision

Implement a Redis-backed rate limiter using sorted sets (sliding window algorithm)
with route-specific defaults surfaced via environment variables.

### Rate Limit Configuration

- `/api/ingestion`: 100 requests per minute (`RATE_LIMIT_INGESTION`, default 100)
- `/api/auth/*`: 10 requests per 15 minutes (`RATE_LIMIT_AUTH`, default 10)
- `/api/webhooks/*`: 60 requests per minute (`RATE_LIMIT_WEBHOOKS`, default 60)
- Other `/api/*`: 60 requests per minute (`RATE_LIMIT_DEFAULT`, default 60)

### Graceful Degradation

Fail open if Redis is unavailable. We log `[Rate Limit]` errors with request
context so SRE can alert, but availability wins over strict enforcement.

### Key Strategy

Use the request IP (derived from `request.ip` or `x-forwarded-for`). This matches
current security posture and works for anonymous routes. We will extend the key
scheme to include authenticated user IDs when session propagation is available in
the middleware.

### Algorithm

Sliding window via Redis sorted sets per key:

1. `ZREMRANGEBYSCORE` to drop events older than the window.
2. `ZADD` current timestamp with a random suffix for uniqueness.
3. `ZCARD` to count events inside the window.
4. `EXPIRE` to let idle keys vanish automatically.
5. When count exceeds the configured max, throw `RateLimitError` with `retryAfter`.

We expose helper APIs to fetch rate-limit headers and reset keys for tests/admin.

## Alternatives Considered

1. **Keep in-memory Map** – fails across processes and deployments. ❌
2. **Fixed window counter** – easy but bursts around window edges. ❌
3. **Token bucket** – robust but more complex than needed today. ❌
4. **Third-party rate limiting (Cloudflare, AWS API Gateway)** – adds cost and
   external dependencies; we already maintain Redis. ❌

## Consequences

### Positive

- Consistent enforcement across all instances.
- Accurate sliding-window semantics reduce burstiness.
- Per-route configuration via env vars; matches audit requirements.
- Fail-open behavior keeps APIs responsive during Redis outages.

### Negative

- Introduces Redis dependency for every API request (adds 1–5 ms RTT).
- Requires deploying Redis in non-dev environments (already planned).

## Implementation

- `libs/redis`: shared `ioredis` client factory with connection reuse, retry,
  and observability hooks.
- `apps/web/src/lib/server/rate-limit.ts`: Redis-backed logic (`checkRateLimit`,
  `getRateLimitInfo`, `resetRateLimit`, `RateLimitError`).
- `apps/web/src/middleware.ts`: centralized enforcement with per-route configs,
  IP-based keys, `X-RateLimit-*` headers, and graceful degradation.
- `.env.example`: Redis connection + rate-limit defaults.
- `apps/web/src/lib/server/__tests__/rate-limit.test.ts`: Redis-backed unit tests.

## References

- Redis rate limiting pattern: https://redis.io/docs/manual/patterns/rate-limiter/
- Stripe engineering blog on rate limiters: https://stripe.com/blog/rate-limiters

