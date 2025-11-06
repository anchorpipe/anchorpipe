---
description: Anchorpipe Cursor Rules Index
alwaysApply: true
---

# Anchorpipe Cursor Rules

This directory contains all Cursor AI rules organized by concern area. Rules use `.mdc` format with frontmatter for metadata.

## Structure

```
.cursor/rules/
├── github/          # PR templates, commits, code quality, epics
├── web/             # Next.js, React, UI/UX, a11y, components
├── backend/         # Services, API, database, Go, Python, Node.js
├── infra/           # Docker, hosting, Terraform, K8s
├── scripts/         # Shell scripts, automation
├── testing/         # Jest, Vitest, Playwright (E2E, a11y, integration)
├── typescript/      # TS/JS code quality and conventions
├── docs/            # Documentation standards, Gherkin
└── project/         # Project-wide rules
```

## Rules by Category

### GitHub (`github/`)
- `pr-template.mdc` - PR requirements, DCO, labels, CI gates
- `commit-messages.mdc` - Conventional Commits + DCO
- `code-quality.mdc` - Review standards, security, budgets
- `epic-template.mdc` - Epic and issue template guidelines

### Web (`web/`)
- `nextjs-app-router.mdc` - Next.js App Router guidelines
- `accessibility.mdc` - WCAG 2.2 standards
- `design-system.mdc` - Component system, tokens, theming
- `motion.mdc` - Animations and micro-interactions
- `forms.mdc` - Form validation and error handling
- `data-viz.mdc` - Data visualization guidelines
- `performance.mdc` - Performance budgets and theming
- `react-components.mdc` - React component creation patterns
- `react-query.mdc` - TanStack Query patterns
- `code-style.mdc` - Code style consistency

### Backend (`backend/`)
- `general.mdc` - General backend service rules
- `ingestion.mdc` - Ingestion service specific
- `scoring.mdc` - Scoring service specific
- `go.mdc` - Go backend service guidelines
- `python-fastapi.mdc` - Python FastAPI best practices
- `nodejs-esm.mdc` - ES Module Node.js guidelines
- `api-client.mdc` - API client patterns (Axios/Fetch)

### Infrastructure (`infra/`)
- `docker.mdc` - Docker and containerization
- `hosting.mdc` - Vercel, Render, object storage, database

### Scripts (`scripts/`)
- `general.mdc` - Shell scripts and automation

### Testing (`testing/`)
- `jest-vitest.mdc` - Unit testing with Jest/Vitest
- `playwright-e2e.mdc` - Playwright E2E testing
- `playwright-a11y.mdc` - Playwright accessibility testing
- `playwright-integration.mdc` - Playwright integration testing

### TypeScript (`typescript/`)
- `code-quality.mdc` - TypeScript/JavaScript code quality
- `code-conventions.mdc` - TypeScript code conventions

### Documentation (`docs/`)
- `documentation.mdc` - Documentation standards
- `gherkin.mdc` - Gherkin-style testing documentation

### Project (`project/`)
- `general.mdc` - Project-wide rules (security, CI, docs, labels, ADRs)

## Usage

Rules automatically apply based on `globs` patterns in their frontmatter. Rules with `alwaysApply: true` apply to all files.

## Alignment

All rules align with:
- PRD (01-prd.md)
- Architecture (02-architecture.md)
- UI Design (03-ui-design.md)
- Quality Handbook (08-quality-handbook.md)
- Release & Operations (09-release-ops.md)
- ADRs in `adr/` directory

