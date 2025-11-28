# Architecture Decision Records

This directory contains the official architecture decision records (ADRs) for anchorpipe. Each ADR captures a significant technical or product decision, the reasoning behind it, and the expected consequences. ADRs are immutable historical documents—use follow-up ADRs to amend previous decisions.

## How ADRs Are Organized

- **Numbering**: Sequential four-digit IDs (`0001`, `0002`, ...). Use the next number when authoring a new ADR.
- **Status**: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`. Update status as decisions progress.
- **Template**: Start from [`template.md`](template.md) for consistency.
- **Location**: Store shared assets (diagrams, etc.) adjacent to the ADR.

## Authoring Checklist

1. Copy `template.md` to a new file named `NNNN-short-title.md` using kebab-case.
2. Fill in status, date, deciders, context, decision, and consequences.
3. Link to related ADRs and issues.
4. Submit via PR with reviewers from the architecture group.
5. Update this index after the ADR is merged.

## Index

| ID                                                         | Title                                                                   | Status   | Date       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-core-backend-stack.md)                         | Core Backend Stack (MVP BFF via Next.js; Rust/Go for Ingestion/Scoring) | Proposed | 2025-10-21 |
| [0002](0002-messaging-selection.md)                        | Messaging Selection (RabbitMQ MVP; Kafka/Redpanda Revisit)              | Proposed | 2025-10-21 |
| [0003](0003-db-sharding-strategy.md)                       | Database Sharding Strategy and Timing                                   | Proposed | 2025-10-21 |
| [0004](0004-ml-serving-for-mcp.md)                         | ML Serving for MCP (Explainable, Versioned, gRPC-first)                 | Proposed | 2025-10-21 |
| [0005](0005-ci-auth-strategy.md)                           | CI Integration Authentication Strategy                                  | Proposed | 2025-10-21 |
| [0006](0006-web-entry-bundle-budget.md)                    | Web Entry Bundle Budget <100KB gz                                       | Proposed | 2025-10-21 |
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

## Related Documentation

- [Repository Structure Guide](../anchorpipe_guide_docs/impo/repo-structure-guide.md)
- [Quality Handbook](../anchorpipe_guide_docs/docs/08-quality-handbook.md)
- [Architecture Overview](../anchorpipe_guide_docs/docs/02-architecture.md)
