# Backend Services

This directory hosts independently deployable backend services for anchorpipe. Each service follows the repository structure defined in `repo-structure-guide.md` (Rust/Go/Node microservices with clear boundaries and their own CI targets).

## Planned Services

| Service         | Language  | Purpose                                                 | Status           |
| --------------- | --------- | ------------------------------------------------------- | ---------------- |
| `ingestion/`    | Rust/Go   | Accept test run payloads, normalize results, push to MQ | Planned (ST-401) |
| `mcp/`          | Go/Python | ML & scoring pipeline for flake analysis                | Planned (ST-303) |
| `notification/` | Node/Go   | Deliver notifications to Slack/email/webhooks           | Planned          |
| `scheduler/`    | Node/Go   | Background jobs (rollups, cleanups)                     | Planned          |

## Directory Expectations

Each service directory should include:

- `src/` source code (language-specific layout)
- `Dockerfile` for deployment
- `README.md` documenting setup, local dev, and deployment procedures
- `Makefile` or task runner (optional, encouraged)
- `tests/` (unit + integration)
- `project.json` (Nx) or other build metadata once service is scaffolded

## Getting Started

1. Create a new directory (`services/<name>/`).
2. Scaffold language-specific boilerplate (use Nx generators where possible).
3. Add service-specific README covering:
   - Purpose and architecture
   - Local development steps
   - Environment variables / secrets
   - Deployment targets and runbooks
4. Register service with Nx (`nx g @nx/node:app` or custom schematic).
5. Configure CI workflows for lint/test/build.

## Related Documentation

- [`anchorpipe_guide_docs/impo/repo-structure-guide.md`](../anchorpipe_guide_docs/impo/repo-structure-guide.md)
- [`anchorpipe_guide_docs/docs/02-architecture.md`](../anchorpipe_guide_docs/docs/02-architecture.md)
- Issue tracker epics: `ST-401` (Ingestion), `ST-303` (MCP), `ST-411` (Notifications)
