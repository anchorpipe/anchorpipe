# Testing Architecture

## Test Pyramid

Anchorpipe relies on a layered approach:

1. **Unit tests** (Vitest) – logic inside libs/services (e.g., rate limiter, idempotency helper).
2. **Route tests** – invoke Next.js route handlers with mocked dependencies to verify HTTP contracts.
3. **Integration tests** – new suites under `apps/web/src/app/api/*/__tests__/*integration.test.ts` simulate middleware, authentication, rate limiting, and service orchestration for critical paths (ingestion, health).
4. **End-to-end** (future) – targeted Playwright flows once the web app is QA-ready.

## Running Tests

Common scripts:

| Command                         | Description                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `npm test`                      | Runs every Vitest target defined in Nx                                          |
| `npm run test:web -- <pattern>` | Filters to specific web tests (`ingestion-service`, `github-app-service`, etc.) |
| `npm run test:coverage`         | Executes all targets with coverage enabled (per-project configs)                |

Vitest configuration lives in `apps/web/vitest.config.ts`, which defines separate Node/DOM projects and shared aliases. Redis/Prisma dependencies are mocked with `vi.mock` to keep unit tests deterministic.

## Writing Tests

- Use helpers from `apps/web/src/app/api/__tests__/integration-test-helpers.ts` to build JSON requests and payloads.
- Prefer structured assertions (`expect.objectContaining`) over brittle snapshots.
- When mocking modules, `vi.importActual` allows partial mocks so core logic stays intact.
- Tests should assert both behavior _and_ observability (log calls, header values, rate limit metadata).

## CI/CD Integration

- GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `build`, and targeted `nx test` jobs on every PR.
- Coverage is uploaded to Codecov; patches must exceed 80% for apps and 90% for libs.
- Security workflows (Dependabot, CodeQL, Trivy) depend on deterministic tests; avoid flaky suites by cleaning up mocks in `beforeEach/afterEach`.

## Local Tips

- Run `npm run test:web -- --runInBand` when debugging to avoid interleaved logs.
- Use `vitest --ui` when iterating on failing cases; Nx is compatible with `vitest.workspace.ts`.
- For Redis- or Prisma-heavy tests, mock the module at import time—never spin up external services in unit or integration suites. Use `docker-compose` only when performing manual smoke tests.\*\*\*
