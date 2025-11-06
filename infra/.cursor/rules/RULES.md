---
description: Infrastructure (Docker Compose, Local Parity) Rules
globs:
  - "infra/**"
alwaysApply: true
---

- Compose services must be healthy locally before push
  - `docker compose up -d && docker compose ps` shows healthy db, redis, mq, storage
- Deterministic environments
  - Use `.env.example` for defaults; never commit real secrets
  - Document ports and healthchecks; prefer named volumes
- CI parity
  - Mirror service versions used by CI workflows
  - Keep developer bootstrap steps copy/paste runnable

@RULES.md

