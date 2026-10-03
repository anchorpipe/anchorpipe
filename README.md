# anchorpipe

**Status: clean-slate redesign in progress.**

anchorpipe is being rebuilt as an open-source, evidence-first analytics system for flaky-test investigation. The redesigned product will preserve immutable test observations, explain uncertainty, and help engineers distinguish nondeterminism from persistent regressions and infrastructure failures.

> The previous Docusaurus documentation site, deployment configuration, and roadmap claims have been removed. The repository is currently a source workspace for the redesign, not a production-ready release.

## Design direction

The approved redesign is intentionally narrow:

- **Evidence before labels:** retain every test execution attempt, environment, commit, order/seed, timing, and failure signature.
- **Uncertainty as data:** report sample counts, failure counts, intervals/posteriors, recency, comparable-condition coverage, and abstention.
- **Durability before distribution:** accept an ingestion only after an immutable receipt and outbox record are committed.
- **Modular monolith plus workers:** keep the control plane and read projections together; move normalization and scoring behind durable asynchronous jobs.
- **Safe integrations:** start with local/JUnit input, the existing JSON adapters, GitHub Actions artifacts, and one idempotent Check Run.
- **Honest operations:** PostgreSQL is the operational source of truth; object storage holds private evidence; Redis is optional and non-authoritative.

The detailed research and gap register are preserved in the redesign work archive and will be distilled into repository documentation after the first implemented vertical slice.

## Current repository state

The codebase contains useful foundations, including report parsers, Prisma models, authentication/RBAC seams, audit models, and unit tests. It is not yet release-ready. The redesign work must first make the clean checkout buildable, make ingestion durable, establish tenant isolation, replace overclaimed behavior with explicit contracts, and add service-backed acceptance tests.

The old docs and deployment surfaces were deliberately removed rather than kept as fictional architecture. New documentation will be written alongside implemented behavior under `docs/` when the first redesigned vertical slice is complete.

## Local development

Prerequisites:

- Docker Engine and Docker Compose v2
- Node.js LTS and npm
- Git

Install dependencies and inspect available workspace targets:

```bash
npm ci
npm run db:generate
npm test
npm run lint
npm run build
```

Local infrastructure is currently intended for development only. Do not expose Compose services publicly or reuse development credentials in any hosted environment. The deployment profile will be redesigned before a production runbook is published.

## Contributing

Contributions use the **Developer Certificate of Origin (DCO)**. Every commit must include a sign-off:

```bash
git commit -s -m "Describe the change"
```

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md) before opening a pull request. Architecture changes should include tests and a short decision record in the repository's future `docs/` area.

## License

The redesigned project is intended to use the **Apache License 2.0**. See [`LICENSE`](LICENSE). The license transition is being handled with provenance and copyright-authority review; third-party code retains its upstream notices and license terms.

Project naming and branding must not imply endorsement or official status for modified distributions.
