# Contributing to anchorpipe

Thank you for helping rebuild anchorpipe. The repository is in a clean-slate redesign phase; please prefer small, evidence-backed changes over adding surface area to unfinished architecture.

## Developer Certificate of Origin

anchorpipe uses the [Developer Certificate of Origin](https://developercertificate.org/), not a Contributor License Agreement. You retain copyright ownership of your contribution and certify that you have the right to submit it under the project license.

Every commit must include a sign-off:

```bash
git commit -s -m "Describe the change"
```

The project is intended to be distributed under the Apache License 2.0. This is a non-exclusive license grant; no copyright assignment, exclusive license, mandatory CLA, commercial-relicensing agreement, or field-of-use restriction is required by this project.

## Before opening a pull request

1. Read [`SECURITY.md`](SECURITY.md) and the repository README.
2. Create a focused branch, for example `feat/ingestion-receipt` or `fix/parser-limit`.
3. Add or update tests for behavior changes.
4. Run the applicable checks from a clean checkout.
5. Sign every commit with `git commit -s`.
6. Explain the user-visible behavior, data model impact, failure modes, and rollback plan.

## Engineering expectations

- Preserve immutable facts; do not overwrite execution history with derived conclusions.
- Make idempotency, retry, timeout, and authorization behavior explicit.
- Do not claim support for an integration or deployment profile that is not implemented and tested.
- Treat test reports, logs, paths, commit data, and artifacts as potentially sensitive.
- Avoid logging credentials, tokens, raw authorization headers, or unnecessary personal data.
- Add service-backed tests for database, object storage, worker, webhook, and replay behavior when changing those boundaries.
- Prefer versioned schemas and additive migrations; use expand/contract for production changes.

## Repository structure

- `apps/` — user-facing applications
- `libs/` — shared libraries and domain modules
- `services/` — independently runnable workers when implemented
- `infra/` — local development infrastructure and operational notes
- `scripts/` — bounded development and release utilities
- `.github/` — contribution, security, and CI policy

The previous Docusaurus site and deployment configuration were removed during the redesign reset. New documentation will be added under `docs/` only when it describes implemented behavior.

## Pull requests

Pull requests should be narrow, reviewable, and linked to the relevant design decision or task. Include:

- a concise problem statement;
- the chosen design and rejected alternatives when material;
- test commands and results;
- security, privacy, tenancy, and operational considerations;
- migration and rollback notes for schema or deployment changes.

Do not include secrets, customer data, generated credentials, or unreviewed third-party code. Preserve upstream notices for all dependencies and vendored material.
