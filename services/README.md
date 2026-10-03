# Backend Services

This directory contains independently bounded backend services for Anchorpipe. **Rust is the selected implementation language for the new service surface**. The existing `services/ingestion/` TypeScript worker remains a separate application and is not changed by the Rust workspace integration.

## Rust service boundaries

The Rust workspace lives at [`rust-workspace/`](rust-workspace/) and discovers these sibling crates when they are added:

| Crate             | Boundary                                                                                                                                                                                   | Status  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `ingestion-rust`  | Accept and validate test-run payloads at the ingestion boundary, then hand off a versioned internal event. It should not own normalization rules, scoring, notifications, or presentation. | Implemented; adapter pending |
| `normalizer-rust` | Convert accepted provider/test-run shapes into the canonical result model. It should not own transport concerns, persistence, queue delivery, or downstream scoring.                       | Implemented; adapter pending |
| `rust-contracts`  | Hold shared, versioned Rust types and serialization contracts used by the service crates. It should remain a dependency-only contracts crate without service runtime or I/O.               | Implemented |

Cargo requires workspace members to be below the workspace manifest, so `rust-workspace/` contains integration-only symlink aliases to the sibling crates. The currently present `ingestion-rust`, `normalizer-rust`, and `rust-contracts` crates are listed as workspace members; future Rust service crates should follow the same integration pattern without copying or moving source. Do not add application production code to `rust-workspace/`; service implementation changes belong in their respective crate directories.

## Local development

From the workspace directory:

```bash
cd services/rust-workspace
cargo fmt --all
cargo check --workspace
cargo test --workspace
cargo audit --manifest-path Cargo.toml
```

The CI workflow runs the same format, check, and test commands. `cargo audit` is expected to fail the job when the audit tool is available and reports findings; CI skips it only when `cargo-audit` cannot be installed or is otherwise unavailable. Until a crate exists, the commands are intentionally deferred by CI.

Use the crate-specific README and manifest for service ports, configuration, queues, persistence, and integration-test setup. No deployment workflow is provided by this integration surface.

## Readiness expectations

Before a Rust service is considered ready for an environment beyond local development, it must have:

- a versioned input/output contract and compatibility tests;
- unit tests plus integration tests covering malformed input, retries, idempotency, and dependency failures;
- explicit ownership, an operational README/runbook, structured logs, metrics, tracing, and health/readiness endpoints;
- documented configuration and secret handling with safe defaults and no committed credentials;
- resource limits, timeout/backpressure behavior, queue or persistence semantics, and a rollback plan;
- security review, dependency audit, reproducible CI checks, and representative load/performance evidence.

## Not production-ready gates

The Rust service surface is **implemented but not production-ready**. It must not be deployed or used as a production replacement until all of the following are true:

1. The three service boundaries and their ownership are documented and implemented without overlapping responsibilities; the current crates still use transport-neutral ports rather than live PostgreSQL/RabbitMQ adapters.
2. Contract, integration, failure-mode, and end-to-end tests pass in CI against the real integration dependencies (or approved test doubles).
3. Observability, alert thresholds, health/readiness behavior, capacity limits, and incident/runbook procedures have been reviewed.
4. Security, privacy, dependency-audit, migration/rollback, and secret-management gates are approved.
5. A production deployment plan, environment configuration, staged rollout, and rollback procedure are explicitly approved in a separate change.

Until then, treat these crates and the workspace checks as scaffolding and validation only. This task adds no deployment, Vercel, project-board, or paid-service integration.

## Related documentation

- [`anchorpipe_guide_docs/impo/repo-structure-guide.md`](../anchorpipe_guide_docs/impo/repo-structure-guide.md)
- [`anchorpipe_guide_docs/docs/02-architecture.md`](../anchorpipe_guide_docs/docs/02-architecture.md)
- Existing ingestion worker: [`ingestion/README.md`](ingestion/README.md)
