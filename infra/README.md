# Infrastructure

Infrastructure-as-code assets, environment configuration, and operational tooling for anchorpipe.

## Current Contents

- `docker-compose.yml` — Local development stack (Postgres, Redis, RabbitMQ, MinIO, supporting services)

## Planned Structure

| Directory    | Purpose                                                          | Status  |
| ------------ | ---------------------------------------------------------------- | ------- |
| `terraform/` | Provision cloud infrastructure (VPC, DB, object storage)         | Planned |
| `render/`    | Render.com application/service configs                           | Planned |
| `k8s/`       | Kubernetes manifests and overlays                                | Planned |
| `env/`       | Environment-specific configs (`.env.example`, secrets templates) | Planned |
| `scripts/`   | Provisioning/teardown/backup scripts                             | Planned |

## Local Development

1. Install Docker Desktop.
2. Start the stack:
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
3. Export environment variables (see `apps/web/README.md`).
4. Run services/tests against the local stack.

Services available after startup:

| Service             | URL                                                           | Notes                 |
| ------------------- | ------------------------------------------------------------- | --------------------- |
| Postgres            | `postgres://postgres:postgres@localhost:15432/anchorpipe_dev` | Primary database      |
| Redis               | `redis://localhost:16379`                                     | Cache / rate limiting |
| RabbitMQ Management | `http://localhost:15672` (guest/guest)                        | Messaging             |
| MinIO Console       | `http://localhost:19001` (minioadmin/minioadmin)              | Object storage        |

## Operational Guidelines

- Treat infrastructure changes as code reviewed PRs.
- Prefer Terraform modules for cloud provisioning once added.
- Secrets are never committed; use environment managers (1Password, AWS Secrets Manager, etc.).
- Document any manual steps in runbooks under `docs/governance` or service READMEs.

## References

- [`repo-structure-guide`](../anchorpipe_guide_docs/impo/repo-structure-guide.md)
- [`docs/09-release-ops.md`](../anchorpipe_guide_docs/docs/09-release-ops.md)
