---
sidebar_position: 3
---

# Architecture Decision Records

Architecture Decision Records (ADRs) document significant architectural decisions made in the anchorpipe project. Each ADR captures a decision, the reasoning behind it, and the expected consequences.

## How ADRs Are Organized

- **Numbering**: Sequential four-digit IDs (`0001`, `0002`, ...)
- **Status**: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`
- **Location**: ADRs live in `apps/docs/docs/reference/adr/` (this directory) and are published automatically to the docs site

## Index

| ID                                                         | Title                                                                   | Status   | Date       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-core-backend-stack.md)                         | Core Backend Stack (MVP BFF via Next.js; Rust/Go for Ingestion/Scoring) | Proposed | 2025-10-21 |
| [0002](0002-messaging-selection.md)                        | Messaging Selection (RabbitMQ MVP; Kafka/Redpanda Revisit)              | Proposed | 2025-10-21 |
| [0003](0003-db-sharding-strategy.md)                       | Database Sharding Strategy and Timing                                   | Proposed | 2025-10-21 |
| [0004](0004-ml-serving-for-mcp.md)                         | ML Serving for MCP (Explainable, Versioned, gRPC-first)                 | Proposed | 2025-10-21 |
| [0005](0005-ci-auth-strategy.md)                           | CI Integration Authentication Strategy                                  | Proposed | 2025-10-21 |
| [0006](0006-web-entry-bundle-budget.md)                    | Web Entry Bundle Budget &lt;100KB gz                                    | Proposed | 2025-10-21 |
| [0007](0007-ingestion-cutover-criteria.md)                 | Ingestion Cutover Criteria (Rust/Go on Render)                          | Proposed | 2025-10-21 |
| [0008](0008-api-style-rest-vs-graphql.md)                  | API Style — REST-first; GraphQL for Aggregates (If Justified)           | Proposed | 2025-10-21 |
| [0009](0009-search-engine.md)                              | Search Engine — Postgres FTS + Trigram (MVP)                            | Proposed | 2025-10-21 |
| [0010](0010-product-site-cta.md)                           | Product Site CTAs — OSS-first Messaging                                 | Proposed | 2025-10-21 |
| [0011](0011-object-storage.md)                             | Object Storage — S3-Compatible (MinIO Dev, Cloud S3 Prod)               | Proposed | 2025-10-21 |
| [0012](0012-failure-details-privacy.md)                    | Privacy for `failure_details` (Redaction & PII Scrub)                   | Proposed | 2025-10-21 |
| [0013](0013-code-organization-server-client-separation.md) | Code Organization — Server/Client Separation in Next.js App             | Proposed | 2025-11-08 |
| [0014](0014-test-database-strategy.md)                     | Test Database Strategy                                                  | Accepted | 2025-11-24 |
| [0015](0015-redis-rate-limiting.md)                        | Redis-Based Rate Limiting                                               | Accepted | 2025-11-25 |
| [0016](0016-idempotency-strategy.md)                       | Idempotency Strategy for Ingestion API                                  | Accepted | 2025-11-28 |
| [0017](0017-error-handling-strategy.md)                    | Error Handling Strategy                                                 | Accepted | 2025-11-28 |
| [0018](0018-observability-strategy.md)                     | Observability Strategy                                                  | Accepted | 2025-11-28 |

## Contributing

To create a new ADR:

1. Copy the [ADR template](template.md) to a new file named `NNNN-short-title.md`
2. Fill in status, date, deciders, context, decision, consequences, alternatives, revisit criteria, and references
3. Link to related ADRs and issues
4. Submit via PR with reviewers from the architecture group
5. Update this index and the docs sidebar entry after the ADR is merged
