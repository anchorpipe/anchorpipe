# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Prerequisites

From the repo root run:

```bash
npm install --legacy-peer-deps
```

## Local Development

```bash
npm run docs:dev
```

This command starts a local Docusaurus dev server and opens a browser window. Most changes are reflected live without restarting the server.

## Build

```bash
npm run docs:build
```

This generates static content into `apps/docs/build`, which Vercel serves in production.

## Deployment

Deployments are handled automatically by Vercel (see `apps/docs/DEPLOYMENT.md`). You typically do **not** run `npm run docs:deploy` locally unless you are testing the Vercel CLI.

## Documentation Quality Checks

Quality gates help us keep spelling, formatting, and links healthy:

- `npm run lint:docs` → markdownlint with project configuration
- `npm run spellcheck:docs` → cspell with shared dictionaries and project terms
- `npm run validate:docs` → runs both checks plus a Docusaurus production build (fails on broken links)

GitHub Actions runs these checks automatically via `.github/workflows/docs-quality.yml`. Locally, run them from the repo root; append `--all` to the command if you want to lint every document instead of only the files changed on your branch.
