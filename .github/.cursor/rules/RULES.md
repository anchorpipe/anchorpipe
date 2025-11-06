---
description: PR, CI, and Repository Hygiene Rules
globs:
  - ".github/**"
alwaysApply: true
---

- Pull Requests
  - Title/commits follow Conventional Commits; link related issues (e.g., ST-203)
  - Provide risk notes and test evidence for changed surfaces
  - Labels: `type:*`, `gate:*`, `area:*`, `priority:*`
- Required checks must pass
  - Lint, typecheck, build, db-health, openapi-validate, DCO, CodeQL, link-check
  - Fix Prettier issues locally before push
- DCO enforcement
  - All commits signed (`-s`); rebase to fix historical unsigned commits on the branch
- Release and dependencies
  - Keep Dependabot/lockfile green; avoid introducing vulnerable packages
  - Semantic Release readiness (Conventional Commits scope/semantics)

@RULES.md

