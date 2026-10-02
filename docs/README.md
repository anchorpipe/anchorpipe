# Anchorpipe documentation

Anchorpipe is in a **clean-slate redesign**. These Markdown documents are the source of truth for the intended product and engineering direction. They are deliberately repository-native: there is no documentation website, Vercel deployment, or docs-specific CI requirement.

## Start here

1. [Product scope](product-scope.md) — the bounded v1 thesis, workflow, non-goals, and acceptance criteria.
2. [Architecture](architecture/README.md) — the modular-monolith-plus-workers target and durable data flow.
3. [Flaky-test detection](algorithms/flaky-test-detection.md) — statistical evidence, retry policy, perturbation experiments, and evaluation.
4. [Ingestion contract](api/ingestion-contract.md) — the proposed API, envelope, idempotency, and processing states.
5. [Security, privacy, and tenancy](security-privacy-tenancy.md) — authorization, evidence handling, webhook trust, and retention invariants.
6. [Operations](operations.md) — supported deployment profiles, reliability, observability, backup, and release gates.
7. [Roadmap and gap register](roadmap.md) — phased implementation plan and current forensic gaps.
8. [Complete redesign research](research/redesign-research.md) — the full research and forensic report, preserved as an auditable record.

## Documentation rules

- Document implemented behavior as fact; label proposals, experiments, and non-goals explicitly.
- Every contract change must identify compatibility, migration, rollback, and security impact.
- Never document a provider, deployment, worker, or feature as supported until an acceptance test proves it.
- Keep sensitive examples synthetic. Do not commit credentials, customer reports, raw logs, or private artifacts.
- Keep research citations and the date/context of conclusions so algorithm and architecture choices remain reviewable.

## Current implementation truth

The repository has useful parser, persistence, authentication, authorization, storage, queue, and test foundations. It is not yet release-ready. The next implementation work is to make the clean checkout buildable, establish tenant isolation, make ingestion durable, add service-backed acceptance tests, and replace overclaimed behavior with explicit contracts.
