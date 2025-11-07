# ADR-0004: ML Serving for MCP (Explainable, Versioned, gRPC-first)

- Status: Proposed
- Date: 2025-10-21

## Context

- Predictive flakiness and root-cause categorization require serving ML models with explainability (SHAP/LIME), versioning, and rollback.

## Decision

- MCP server exposes a gRPC inference API with standard request/response contracts.
- Initial serving: custom gRPC wrapper around model runtime (e.g., Python FastAPI sidecar or Rust/Go bindings); capture SHAP values when enabled.
- Mandatory: model versioning, canary rollout, rollback triggers.

## Consequences

- Consistent interface across models; polyglot model support.
- Explainability overhead must be bounded; can be toggleable.

## Alternatives considered

- TorchServe/TensorFlow Serving directly (less flexible for XAI hooks).
- REST-only inference (less efficient for high-throughput).

## Revisit criteria

- Latency/throughput constraints; operational overhead; model lifecycle maturity.

## References

- PRD §5.2, §5.8; Algorithm doc; Research §3.2.
