# Data Subject Request Workflows (ST-205)

## Overview

Implements the ST-205 requirements for exporting personal data and processing deletion requests. Users can submit requests via `/account/privacy`, track SLA status, and download export payloads.

This workflow ensures compliance with GDPR Article 15 (Right of Access), Article 20 (Right to Data Portability), and Article 17 (Right to Erasure), as well as CCPA data access and deletion requirements.

## Endpoints

- `POST /api/dsr/export` – queues and completes an export request, returns metadata for the generated download.
- `GET /api/dsr/export/:requestId` – downloads the completed export (JSON format, default).
- `GET /api/dsr/export/:requestId?format=csv` – downloads the completed export in CSV format.
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

## Export Formats

### JSON Format (Default)

**GET** `/api/dsr/export/:requestId`

Returns the export data as formatted JSON.

**Response Headers:**

- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="anchorpipe-export-{requestId}.json"`

### CSV Format

**GET** `/api/dsr/export/:requestId?format=csv`

Returns the export data as CSV for easy import into spreadsheet applications.

**Response Headers:**

- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="anchorpipe-export-{requestId}.csv"`

**CSV Structure:**

- User information section (ID, email, GitHub login, name, etc.)
- Repository roles section (with repository details)
- Role audit logs section (with action history)
- Proper CSV escaping for all values (commas, quotes, newlines)

**Example Usage:**

```bash
# Download JSON format (default)
curl -H "Cookie: session=..." https://api.anchorpipe.dev/api/dsr/export/abc123

# Download CSV format
curl -H "Cookie: session=..." "https://api.anchorpipe.dev/api/dsr/export/abc123?format=csv"
```

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

## Compliance Details

### Legal Basis

DSR requests are processed under the following legal bases:

- **GDPR Article 6(1)(a)**: Consent (for telemetry and optional data)
- **GDPR Article 6(1)(b)**: Contract performance (for service delivery)
- **GDPR Article 6(1)(f)**: Legitimate interests (for security and fraud prevention)

### Response Timeframes

- **GDPR**: 30 days (extendable to 60 days for complex requests with notification)
- **CCPA**: 45 days (extendable to 90 days with notification)
- **Default SLA**: 30 days (configurable via `DSR_SLA_DAYS`)

### Verification Requirements

For security, we may request verification of identity before processing DSR requests:

- **Account Verification**: User must be logged in to their account
- **Additional Verification**: May request additional proof of identity for sensitive requests
- **Third-Party Requests**: Require explicit authorization from the data subject

### Exceptions and Limitations

Some data may not be subject to deletion requests:

- **Legal Obligations**: Data required by law, regulation, or court order
- **Legitimate Interests**: Data necessary for fraud prevention or security
- **Contractual Requirements**: Data necessary for contract performance
- **Anonymized Data**: Data that has been anonymized and cannot be linked to an individual

### Audit and Documentation

All DSR requests are:

- **Logged**: Recorded in audit logs with timestamps and request details
- **Tracked**: Status and processing timeline maintained for compliance
- **Documented**: Confirmation and completion records retained per [Retention Policy](../../reference/compliance/retention-policy.md)

## Review Cadence and Ownership

### Policy Review

- **Frequency**: Annual review, or when regulations change
- **Owner**: Data Protection Officer (dpo@anchorpipe.dev)
- **Stakeholders**: Legal, Security, Engineering, Product teams

### Process Improvement

- **Quarterly Review**: Review DSR processing times and user feedback
- **Annual Audit**: Internal audit of DSR compliance and procedures
- **Training**: Annual training for support and engineering teams on DSR handling

### Documentation Updates

- **Regulatory Changes**: Update documentation when GDPR, CCPA, or other regulations change
- **Process Changes**: Update when DSR workflow or retention policies change
- **Version Control**: Maintain version history of compliance documentation

## Related Documentation

- [Privacy Policy](../../reference/compliance/privacy-policy.md) - How we handle personal data
- [Data Processing Agreement](../../reference/compliance/data-processing-agreement.md) - Enterprise DPA
- [Retention Policy](../../reference/compliance/retention-policy.md) - Data retention periods
- [Compliance Documentation](../../reference/compliance/README.md) - Compliance documentation index

## Operational Notes

- Extend email worker to consume telemetry events (`dsr.email_queued`).
- Background job infrastructure can transition status to `processing` for long-running exports; current implementation completes synchronously.
- For hard deletes, extend metadata and retention policy per compliance guidance.
