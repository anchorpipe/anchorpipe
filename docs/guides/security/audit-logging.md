# Audit Logging (ST-206)

## Overview

Implements comprehensive audit logging for sensitive operations, covering authentication, role management, and data subject request flows. Entries are immutable, timestamped, and queryable via the new `/api/audit-logs` endpoint (admin-only).

## Data Model

- `AuditLog` table with enums `AuditAction` and `AuditSubject`.
- Stores actor, subject, description, metadata (sanitized), IP address, and user agent.
- Indexed by `subject/subjectId` and `createdAt` for efficient queries.

## Captured Actions

- `login_success` / `login_failure` (email conflict & invalid attempts).
- `user_created` (registration).
- `role_assigned` / `role_removed`.
- `dsr_export_request`, `dsr_deletion_request`, `dsr_export_download`.
- Hooks available for future config/token events.

## API

- `GET /api/audit-logs?limit=50&subject=dsr&actorId=...` → returns most recent entries (requires repo admin role).
- Responses include actor metadata, timestamps, sanitized metadata payload.

## Usage

- `writeAuditLog()` helper sanitizes metadata and clamps text length.
- `extractRequestContext()` centralizes IP/user agent extraction.
- Services (`rbac-service`, `dsr-service`, auth routes) call helpers to record events.

## Operations

- No update/delete mutations; audit logs append-only.
- Monitor suspicious patterns by scanning for repeated `login_failure` entries.
- Future enhancements: stream to SIEM, add alerting via telemetry events.
