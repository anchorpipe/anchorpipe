# Data Subject Request Workflows (ST-205)

## Overview

Implements the ST-205 requirements for exporting personal data and processing deletion requests. Users can submit requests via `/account/privacy`, track SLA status, and download export payloads.

## Endpoints

- `POST /api/dsr/export` – queues and completes an export request, returns metadata for the generated download.
- `GET /api/dsr/export/:requestId` – downloads the completed export JSON file.
- `POST /api/dsr/deletion` – redacts personal data and revokes access. Optional `reason` field (≤500 chars).
- `GET /api/dsr` – lists historical DSR requests and event timeline for the authenticated user.

## Data Model

- `DataSubjectRequest` – tracks request state (`pending`, `processing`, `completed`, `failed`), SLA deadline, processed timestamp, and payload/metadata.
- `DataSubjectRequestEvent` – immutable audit trail recording status transitions and operational notes.
- Telemetry events (`dsr.email_queued`) recorded for downstream mailer infrastructure.

## Export Payload Contents

- User profile (email, GitHub login, name, telemetry preferences).
- Repository role assignments with timestamps.
- Recent role audit log entries (actor + target perspectives).

Payload is stored in `data_subject_requests.export_data` (JSONB) and exposed via the download endpoint.

## Deletion Workflow

- Removes sessions, OAuth accounts, and repository roles.
- Redacts personal fields on `users` (email, GitHub login, display name, preferences).
- Updates DSR metadata with summary of redacted data and request reason (if provided).
- Logs completion event and queues email telemetry for recordkeeping.

## SLA Tracking

- Default SLA: 30 days (override via `DSR_SLA_DAYS`).
- `due_at` and event timeline surfaced in UI to demonstrate compliance.
- Confirmation timestamps (`processed_at`, `confirmation_sent_at`) persisted for auditing.

## UI (Account ▸ Privacy)

- Export button (immediate completion with download link).
- Deletion request form with optional reason.
- Request history table with statuses, due date, and download actions.
- Collapsible event list displaying the three most recent events per request.

## Operational Notes

- Extend email worker to consume telemetry events (`dsr.email_queued`).
- Background job infrastructure can transition status to `processing` for long-running exports; current implementation completes synchronously.
- For hard deletes, extend metadata and retention policy per compliance guidance.
