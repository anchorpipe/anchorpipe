# Rate Limiting Architecture

## Overview

Anchorpipe enforces API rate limits in the Next.js middleware (`apps/web/src/middleware.ts`). Requests are keyed by client IP plus pathname and checked against Redis using a sliding-window algorithm.

- `/api/ingestion` – 100 requests/min (configurable via `RATE_LIMIT_INGESTION`)
- `/api/auth/*` – 10 requests/15 min
- `/api/webhooks/*` – 60 requests/min
- All other `/api/*` routes – defaults to 60 requests/min
- `/api/health` and `/api/metrics` bypass rate limiting to guarantee availability for monitoring

Each response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers for observability. When the limit is exceeded, middleware returns `429` with an error envelope and `Retry-After`.

## Configuration

Environment variables control per-route budgets:

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_INGESTION` | `100` | Requests/min for ingestion |
| `RATE_LIMIT_AUTH` | `10` | Requests/15 min for auth routes |
| `RATE_LIMIT_WEBHOOKS` | `60` | Requests/min for GitHub App webhooks |
| `RATE_LIMIT_DEFAULT` | `60` | Fallback for other `/api/*` routes |

Redis connection details live in `libs/redis`. Middleware uses `checkRateLimit`/`getRateLimitInfo` from `@/lib/server/rate-limit` so swapping implementations requires only that module.

## Testing

- Unit coverage: `apps/web/src/__tests__/middleware.test.ts` ensures headers and failure modes are correct.
- Integration coverage: `apps/web/src/app/api/ingestion/__tests__/ingestion.integration.test.ts` simulates 101 requests to verify enforcement.
- To run only middleware tests: `npm run test:web -- middleware`.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| All API calls returning 429 | Verify Redis connectivity and that the middleware isn't reusing a fixed IP (e.g., reverse proxies missing `x-forwarded-for`). |
| Headers missing or zero | Ensure middleware is executing (Next.js `matcher` must include route). |
| Health endpoints throttled | Confirm additional routes were not added under `/api/health/*`; only `/api/health` is exempt. |

Fallback behavior: if Redis is unavailable, middleware logs `[Middleware] Unexpected rate limit error` and allows the request so production traffic continues. Use logs plus Redis metrics to detect this state.***

