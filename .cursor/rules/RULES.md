---
description: Anchorpipe Global Cursor Rules
globs:
  - "**/*"
alwaysApply: true
---

- Use Conventional Commits with DCO sign-off
  - Use: `git commit -s -m "type(scope): message"`
  - Amend: `git commit -s --amend --no-edit`
- Enforce pre-push local parity with CI
  - `npx prettier --check . || npx prettier --write .`
  - `npm run lint && npm run typecheck && npm run build`
  - `docker compose up -d && docker compose ps`
  - `(cd apps/web && npm ci && npm run build)`
- Keep `package-lock.json` deterministic
  - Regenerate on conflicts with `npm install --legacy-peer-deps`
  - Never hand-edit lockfiles
- Security and quality invariants (must not regress)
  - Security headers and CSP enforced in `apps/web/src/middleware.ts`
  - All API inputs validated with Zod; sanitize and rate-limit sensitive endpoints
  - No secrets in code; `.env.local` in `.gitignore`; provide `.env.example`
  - Reduce complexity hotspots (cc > 8) when touching files
- PR protocol and gates
  - Title/commits follow Conventional Commits; link ST issue(s)
  - Apply labels: `type:*`, `gate:*`, `area:*`, `priority:*`
  - Resolve conflicts locally; avoid web conflict editor for complex files
  - CI must be green: lint, typecheck, build, db-health, openapi-validate, DCO, security scans

@RULES.md

