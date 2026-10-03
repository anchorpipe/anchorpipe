# Backend Services

This directory contains the independently deployable backend services that make up the Anchorpipe data pipeline. Each service is a separate crate under its own directory, shares versioned types through `pipeline-contracts`, and communicates with the rest of the system only through explicit ports: the durable Postgres outbox, the message broker, and object storage for evidence artifacts.

## Service boundaries

| Service               | Boundary                                                                                                                                                              | Status              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `receipt-gate`        | Authenticated, durable intake at the ingestion boundary. Validates payloads, writes an idempotent receipt plus outbox event in one transaction, stores raw evidence, and returns 202. It does not normalize, score, or notify. | Implemented; live adapters in progress |
| `canonicalizer`       | Consumes accepted intake events from the queue and converts provider/test-run shapes into the canonical result model, writing results through the processing ledger with DLQ discipline. It does not own transport or presentation. | Implemented; live adapters in progress |
| `relay`               | Transactional outbox relay: drains committed `outbox_events` rows and publishes them to the broker with at-least-once delivery semantics. The single connective piece between the API control plane and pipeline workers. | In progress |
| `pipeline-contracts`  | Shared, versioned types and serialization contracts used by every service crate. Dependency-only crate without service runtime or I/O.                                 | Implemented          |

The Cargo integration workspace lives at [`pipeline/`](pipeline/) and lists each sibling crate as a member through path aliases, so `cargo check --workspace` covers the entire pipeline surface from one directory. Do not add application production code to `pipeline/`; implementation changes belong in each service's own directory.

## Local development

From the workspace directory:

```bash
cd services/pipeline
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo check --workspace
cargo test --workspace
cargo audit --manifest-path Cargo.toml
```

The CI workflow (`.github/workflows/pipeline-services.yml`) runs the same format, lint, check, and test commands on every push and pull request that touches the pipeline surface. `cargo audit` fails the job when the audit tool is available and reports findings; CI skips it only when `cargo-audit` cannot be installed.

Use the crate-specific README and manifest for service ports, configuration, queues, persistence, and integration-test setup. No deployment workflow is provided by this integration surface.

## Readiness expectations

Before a service is considered ready for an environment beyond local development, it must have:

- a versioned input/output contract and compatibility tests;
- unit tests plus integration tests covering malformed input, retries, idempotency, and dependency failures;
- explicit ownership, an operational README/runbook, structured logs, metrics, tracing, and health/readiness endpoints;
- documented configuration and secret handling with safe defaults and no committed credentials;
- resource limits, timeout/backpressure behavior, queue or persistence semantics, and a rollback plan;
- security review, dependency audit, reproducible CI checks, and representative load/performance evidence.

## Not production-ready gates

The pipeline service surface is **implemented but not production-ready**. It must not be deployed or used as a production replacement until all of the following are true:

1. The service boundaries and their ownership are documented and implemented without overlapping responsibilities; live PostgreSQL/broker adapters must pass integration tests rather than transport-neutral port stubs alone.
2. Contract, integration, failure-mode, and end-to-end tests pass in CI against the real integration dependencies (or approved test doubles).
3. Observability, alert thresholds, health/readiness behavior, capacity limits, and incident/runbook procedures have been reviewed.
4. Security, privacy, dependency-audit, migration/rollback, and secret-management gates are approved.
5. A production deployment plan, environment configuration, staged rollout, and rollback procedure are explicitly approved in a separate change.

Until then, treat these crates and the workspace checks as scaffolding and validation only.

## Related documentation

- Architecture overview: [`docs/architecture/README.md`](../docs/architecture/README.md)
- Ingestion HTTP contract: [`docs/api/ingestion-contract.md`](../docs/api/ingestion-contract.md)
