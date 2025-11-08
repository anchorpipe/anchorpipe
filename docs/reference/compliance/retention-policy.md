# Data Retention Policy

**Last Updated**: January 2025

## Overview

This Data Retention Policy defines how long Anchorpipe retains different categories of data. Retention periods are designed to balance service functionality, legal compliance, and user privacy.

## General Principles

1. **Minimization**: Retain data only as long as necessary for the stated purpose
2. **Compliance**: Meet legal, regulatory, and contractual obligations
3. **User Rights**: Honor data deletion requests within applicable timeframes
4. **Service Continuity**: Retain data necessary for service delivery
5. **Audit and Security**: Retain audit logs and security data for compliance and investigation

## Retention Periods by Data Category

### User Account Data

| Data Type            | Retention Period               | Notes                                               |
| -------------------- | ------------------------------ | --------------------------------------------------- |
| Active Account Data  | While account is active        | Email, profile, preferences                         |
| Deleted Account Data | 30 days after deletion request | Personal data redacted, metadata retained for audit |
| Authentication Data  | While account is active        | OAuth tokens, session data                          |
| Account Preferences  | While account is active        | Telemetry, notification settings                    |

**Deletion Process**: Upon account deletion request, personal data (email, GitHub login, display name) is redacted within 30 days. Account metadata (ID, timestamps) may be retained for audit purposes.

### Repository and Test Data

| Data Type                | Retention Period              | Notes                              |
| ------------------------ | ----------------------------- | ---------------------------------- |
| Test Results             | 30 days (configurable)        | Raw test results, test runs        |
| Test Run Metadata        | 30 days (configurable)        | Commit SHA, run ID, framework info |
| Repository Configuration | While repository is connected | Repository settings, integrations  |
| Aggregated Metrics       | 2 years                       | Test scores, trends, analytics     |

**Configuration**: Default retention is 30 days. Enterprise customers may configure longer retention periods via environment variables (`TEST_RUN_RETENTION_DAYS`).

### Audit and Security Data

| Data Type       | Retention Period | Notes                                                    |
| --------------- | ---------------- | -------------------------------------------------------- |
| Audit Logs      | 2 years          | All audit log entries                                    |
| Security Events | 2 years          | Failed logins, rate limit violations, security incidents |
| Access Logs     | 90 days          | API access logs, IP addresses                            |
| Security Scans  | 1 year           | CodeQL, Dependabot, Snyk scan results                    |

**Purpose**: Audit logs are retained for compliance, security investigation, and legal requirements.

### Data Subject Requests (DSR)

| Data Type            | Retention Period     | Notes                                       |
| -------------------- | -------------------- | ------------------------------------------- |
| DSR Request Metadata | 2 years              | Request ID, status, timestamps              |
| Export Payloads      | 30 days after export | User data exports (downloadable)            |
| Deletion Records     | 2 years              | Confirmation of deletion, redaction summary |
| DSR Event Logs       | 2 years              | Status transitions, operational notes       |

**SLA**: DSR requests are processed within 30 days (configurable via `DSR_SLA_DAYS`).

### Communication and Support Data

| Data Type           | Retention Period | Notes                              |
| ------------------- | ---------------- | ---------------------------------- |
| Support Tickets     | 2 years          | Customer support communications    |
| Email Notifications | 90 days          | Sent notifications (metadata only) |
| Telemetry Events    | 30 days          | Usage telemetry, event logs        |

### Compliance and Legal Data

| Data Type          | Retention Period | Notes                                       |
| ------------------ | ---------------- | ------------------------------------------- |
| Legal Documents    | 7 years          | Contracts, agreements, legal correspondence |
| Compliance Records | 7 years          | Compliance certifications, audit reports    |
| Incident Reports   | 7 years          | Security incident reports and resolutions   |

## Data Deletion Process

### Automatic Deletion

- **Scheduled Cleanup**: Automated jobs delete expired data according to retention periods
- **Cascade Deletion**: Related data is deleted when parent records are removed
- **Soft Delete**: Some data is soft-deleted (marked as deleted) before permanent deletion

### Manual Deletion

- **User Requests**: Data deletion requests are processed within 30 days
- **Account Closure**: All user data is redacted upon account deletion
- **Legal Requests**: Data may be deleted earlier upon legal request or court order

### Deletion Verification

- **Confirmation**: Users receive confirmation when deletion is complete
- **Audit Trail**: Deletion actions are logged in audit logs
- **Certification**: Enterprise customers may request deletion certification

## Data Archival

### Long-Term Storage

Some data may be archived (moved to cold storage) before deletion:

- **Test Results**: Archived after 30 days, deleted after 1 year
- **Audit Logs**: Archived after 1 year, deleted after 2 years
- **Aggregated Metrics**: Retained in aggregated form (no personal data)

### Archive Access

- **Read-Only**: Archived data is read-only and not accessible via normal APIs
- **Restoration**: Archived data can be restored upon request (within retention period)
- **Deletion**: Archived data is permanently deleted at the end of the retention period

## Special Circumstances

### Legal Holds

Data may be retained beyond normal retention periods when:

- **Legal Proceedings**: Subject to litigation, investigation, or legal process
- **Regulatory Requirements**: Required by law, regulation, or government order
- **Contractual Obligations**: Required by contract or agreement

Legal holds override normal retention periods and are documented.

### Anonymization

Some data may be anonymized (removing personal identifiers) instead of deleted:

- **Aggregated Analytics**: Test metrics aggregated without personal data
- **Research Data**: Anonymized data used for service improvement
- **Compliance Reporting**: Anonymized data for compliance reports

Anonymized data is not subject to data subject rights requests.

## Configuration and Overrides

### Environment Variables

Retention periods can be configured via environment variables:

- `TEST_RUN_RETENTION_DAYS`: Test result retention (default: 30)
- `DSR_SLA_DAYS`: DSR processing SLA (default: 30)
- `AUDIT_LOG_RETENTION_DAYS`: Audit log retention (default: 730)
- `TELEMETRY_RETENTION_DAYS`: Telemetry retention (default: 30)

### Enterprise Customization

Enterprise customers may negotiate custom retention periods:

- **Extended Retention**: Longer retention for test results or audit logs
- **Shorter Retention**: Shorter retention for compliance with specific regulations
- **Custom Policies**: Industry-specific or jurisdiction-specific retention requirements

## Compliance

This retention policy is designed to comply with:

- **GDPR**: Article 5(1)(e) - Storage limitation principle
- **CCPA**: Data retention and deletion requirements
- **Industry Standards**: SOC 2, ISO 27001 data retention requirements
- **Other Applicable Laws**: As required by jurisdiction

## Review and Updates

- **Annual Review**: This policy is reviewed annually
- **Regulatory Changes**: Updated when data protection laws change
- **Service Changes**: Updated when service features affect data retention
- **Version History**: Changes are documented with version numbers

## Contact

For questions about data retention:

- **Privacy Inquiries**: privacy@anchorpipe.dev
- **Data Protection Officer**: dpo@anchorpipe.dev
- **Enterprise Customers**: Contact your account manager

## Related Documents

- [Privacy Policy](privacy-policy.md) - How we handle personal data
- [Data Processing Agreement](data-processing-agreement.md) - DPA for enterprise customers
- [Data Subject Request Workflows](../security/data-subject-requests.md) - How to request data deletion

---

**Effective Date**: January 2025  
**Version**: 1.0
