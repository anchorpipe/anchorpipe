# ADR-0012: Privacy for failure_details (Redaction & PII Scrub)

- Status: Proposed
- Date: 2025-10-21

## Context

- failure_details may contain stack traces, env fragments, or PII.

## Decision

- Redact sensitive tokens/keys/URLs/emails via regex and allow list.
- Drop or hash repo names unless consented; scrub secrets; cap stored snippet length.
- Access control: restrict raw failure_details to authorized roles; audit access.
- Retention: raw details align to TestRun retention (default 30d); aggregates retained longer.

## Consequences

- Reduced risk; slightly less raw context unless user opts-in to richer storage.

## Alternatives considered

- Store raw unredacted (unacceptable risk).

## Revisit criteria

- New compliance regimes; user opt-in for richer diagnostics.

## References

- PRD §5.7; Compliance/DPIA.
