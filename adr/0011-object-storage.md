# ADR-0011: Object Storage — S3-Compatible (MinIO Dev, Cloud S3 Prod)

- Status: Proposed
- Date: 2025-10-21

## Context
- Large/raw artifacts should not bloat Postgres.

## Decision
- Use S3-compatible storage; MinIO for local/dev; cloud S3 in production.
- Encrypt at rest; server-side encryption keys via KMS.
- Bucket layout: fr-artifacts/<env>/<repo_id>/<yyyy>/<mm>/<dd>/<run_id>/...
- Lifecycle/retention per compliance (defaults align to data policies).

## Consequences
- Reduced DB storage; simpler archival.

## Alternatives considered
- Store in DB (undesirable); NFS volumes (ops-heavy).

## Revisit criteria
- Cost/latency constraints; vendor changes.

## References
- Architecture §5.2; PRD §6.7.
