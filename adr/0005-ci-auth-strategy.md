# ADR-0005: CI Integration Authentication Strategy

- Status: Proposed
- Date: 2025-10-21

## Context
- Need secure, least-privilege access for PR bot and repository metadata.

## Decision
- Prefer GitHub App with minimal scopes (metadata:read, contents:read, pull_requests:write, checks:write).
- Support fine-grained PATs only for edge/non-GitHub CI cases; document strict scopes and rotation.

## Consequences
- Better security posture; clearer auditability.
- Slightly higher setup complexity vs PATs.

## Alternatives considered
- PAT-first (worse security, rotation burden).

## Revisit criteria
- API changes to GitHub App model; new CI providers requiring alternative auth.

## References
- PRD §5.3; Research §4.
