---
description: Next.js Web (TypeScript, Tailwind, Zod) Rules
globs:
  - "apps/web/**"
alwaysApply: true
---

- Next.js App Router patterns
  - Prefer Server Components by default; move client logic behind `"use client"`
  - Split routes and lazy-load heavy components; enforce entry bundle < 100KB gz
- TypeScript and Zod at edges
  - Validate all API route inputs with Zod schemas; reject unknown fields
  - Keep schemas in `apps/web/src/lib/schemas/`; reuse across routes
- Security headers and CSP
  - Maintain headers in `apps/web/src/middleware.ts`; do not weaken CSP without ADR
  - Deny framing, nosniff, strict referrer policy; same-origin COOP/CORP
- Styling and accessibility
  - Tailwind utility-first; avoid ad-hoc CSS where Tailwind fits
  - A11y: keyboard access, labeled forms, visible focus, axe-critical=0 for polished pages
- Testing
  - Unit: Jest/Vitest colocated; E2E: Playwright for critical flows
  - Add tests when changing auth, validation, or middleware

@RULES.md

