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

## SIEM Integration

Anchorpipe supports forwarding audit logs to SIEM (Security Information and Event Management) systems for enhanced security monitoring and compliance.

### Supported SIEM Systems

- **HTTP/HTTPS**: Generic HTTP adapter for any SIEM system that accepts HTTP/HTTPS logs
- **Splunk**: HTTP Event Collector (HEC) integration
- **Elasticsearch**: Direct indexing via Elasticsearch API
- **Syslog**: Syslog protocol support (UDP, TCP, TLS) - placeholder implementation

### Log Formats

SIEM integration supports multiple log formats:

- **JSON**: Standard JSON format (default)
- **CEF**: Common Event Format (ArcSight, QRadar compatible)
- **LEEF**: Log Event Extended Format (IBM QRadar compatible)

### Configuration

Enable SIEM forwarding via environment variables:

```bash
# Enable SIEM forwarding
SIEM_ENABLED=true

# SIEM Type (http|syslog|splunk|elasticsearch)
SIEM_TYPE=http

# Batch processing settings
SIEM_BATCH_SIZE=50
SIEM_RETRY_ATTEMPTS=3
SIEM_RETRY_DELAY=1000
SIEM_TIMEOUT=5000
```

#### HTTP Adapter Configuration

```bash
SIEM_HTTP_URL=https://siem.example.com/api/logs
SIEM_HTTP_METHOD=POST
SIEM_HTTP_AUTH_TOKEN=Bearer token
# OR
SIEM_HTTP_AUTH_USERNAME=user
SIEM_HTTP_AUTH_PASSWORD=pass
```

#### Splunk HEC Configuration

```bash
SIEM_SPLUNK_HOST=splunk.example.com
SIEM_SPLUNK_PORT=8088
SIEM_SPLUNK_TOKEN=your-hec-token
SIEM_SPLUNK_INDEX=main
SIEM_SPLUNK_SOURCE=anchorpipe
SIEM_SPLUNK_SOURCETYPE=anchorpipe:audit
```

#### Elasticsearch Configuration

```bash
SIEM_ELASTICSEARCH_URL=http://elasticsearch:9200
SIEM_ELASTICSEARCH_INDEX=anchorpipe-audit
SIEM_ELASTICSEARCH_USERNAME=elastic
SIEM_ELASTICSEARCH_PASSWORD=password
# OR
SIEM_ELASTICSEARCH_API_KEY=your-api-key
```

#### Syslog Configuration

```bash
SIEM_SYSLOG_HOST=syslog.example.com
SIEM_SYSLOG_PORT=514
SIEM_SYSLOG_PROTOCOL=udp
SIEM_SYSLOG_FACILITY=16
SIEM_SYSLOG_TAG=anchorpipe
```

### API Endpoints

#### Forward Audit Logs

```bash
POST /api/admin/siem/forward?batchSize=50
```

Manually trigger forwarding of audit logs to SIEM. Requires admin authentication.

**Response:**

```json
{
  "success": true,
  "processed": 50,
  "failed": 0,
  "errors": []
}
```

#### Test SIEM Connection

```bash
GET /api/admin/siem/test
```

Test connectivity to the configured SIEM system. Requires admin authentication.

**Response:**

```json
{
  "success": true,
  "error": null
}
```

### Automatic Forwarding

In production, set up a scheduled job or worker to automatically forward audit logs:

```typescript
// Example: Scheduled job (every 5 minutes)
import { forwardAuditLogsToSiem } from '@/lib/server/siem-forwarder';

setInterval(
  async () => {
    await forwardAuditLogsToSiem(50); // Process 50 logs at a time
  },
  5 * 60 * 1000
);
```

### Features

- **Batch Processing**: Processes logs in configurable batches
- **Retry Logic**: Automatic retry with exponential backoff for failed forwards
- **Error Handling**: Comprehensive error logging and reporting
- **Multiple Formats**: Support for JSON, CEF, and LEEF formats
- **Provider Agnostic**: Easy to add new SIEM providers

### Monitoring

Monitor SIEM forwarding via:

- Admin API endpoints (forward/test)
- Application logs (success/failure rates)
- SIEM system dashboards (verify log receipt)

### Troubleshooting

**Logs not appearing in SIEM:**

1. Verify `SIEM_ENABLED=true` is set
2. Check SIEM endpoint configuration
3. Test connection using `/api/admin/siem/test`
4. Review application logs for forwarding errors
5. Verify network connectivity to SIEM system

**High failure rate:**

1. Check SIEM system capacity
2. Verify authentication credentials
3. Review timeout settings (`SIEM_TIMEOUT`)
4. Check batch size (`SIEM_BATCH_SIZE`)

### Future Enhancements

- Automatic forwarding on audit log creation (optional hook)
- Dead letter queue for permanently failed logs
- Metrics and monitoring dashboard
- Additional SIEM provider support

## Security Alerting

Anchorpipe includes automated alerting for suspicious patterns detected in audit logs. This helps identify potential security threats early.

### Supported Patterns

The system detects the following suspicious patterns:

- **Multiple Failed Logins**: Repeated failed login attempts from the same IP address
- **HMAC Auth Failures**: Multiple failed HMAC authentication attempts for a repository
- **Rapid Role Changes**: Unusual number of role assignments/removals in a short time
- **Token Abuse**: Unusual number of token revocations by a single user

### Alert Channels

Alerts can be sent via multiple channels:

- **Email**: Send alerts to configured email addresses
- **Webhook**: POST alerts to a configured webhook endpoint
- **SIEM**: Forward alerts to SIEM systems (via SIEM integration)

### Configuration

Enable security alerting via environment variables:

```bash
# Enable security alerts
SECURITY_ALERTS_ENABLED=true

# Alert channels (comma-separated: email, webhook, siem, all)
SECURITY_ALERTS_CHANNELS=email,webhook

# Email recipients (comma-separated)
SECURITY_ALERTS_EMAIL_RECIPIENTS=security@example.com,admin@example.com

# Webhook configuration
SECURITY_ALERTS_WEBHOOK_URL=https://alerts.example.com/webhook
SECURITY_ALERTS_WEBHOOK_SECRET=your-webhook-secret

# Pattern detection thresholds
ALERT_FAILED_LOGIN_THRESHOLD=10        # Number of failed logins to trigger alert
ALERT_FAILED_LOGIN_WINDOW_MS=900000    # 15 minutes
ALERT_BRUTE_FORCE_THRESHOLD=20         # Number of attempts for brute force detection
ALERT_BRUTE_FORCE_WINDOW_MS=1800000    # 30 minutes
ALERT_HMAC_FAILURE_THRESHOLD=10        # Number of HMAC failures to trigger alert
ALERT_HMAC_FAILURE_WINDOW_MS=900000    # 15 minutes
ALERT_ROLE_CHANGE_THRESHOLD=5          # Number of role changes to trigger alert
ALERT_ROLE_CHANGE_WINDOW_MS=3600000    # 1 hour
ALERT_TOKEN_REVOCATION_THRESHOLD=10   # Number of token revocations to trigger alert
ALERT_TOKEN_REVOCATION_WINDOW_MS=3600000 # 1 hour
```

### API Endpoint

#### Check Security Patterns

```bash
POST /api/admin/security-alerts/check
```

Manually trigger security pattern detection and alerting. Requires admin authentication.

**Response:**

```json
{
  "message": "Security pattern detection completed",
  "patternsDetected": 2,
  "alertsSent": 2,
  "errors": []
}
```

### Alert Severity Levels

- **Low**: Minor suspicious activity
- **Medium**: Moderate security concern (e.g., multiple failed logins)
- **High**: Significant security threat (e.g., brute force attempts, HMAC failures)
- **Critical**: Immediate security threat requiring immediate action

### Automatic Detection

In production, set up a scheduled job to automatically check for suspicious patterns:

```typescript
// Example: Scheduled job (every 5 minutes)
import { checkAndAlertSuspiciousPatterns } from '@/lib/server/security-alerts';

setInterval(
  async () => {
    await checkAndAlertSuspiciousPatterns();
  },
  5 * 60 * 1000
);
```

### Webhook Payload

When using webhook alerts, the payload format is:

```json
{
  "type": "security_alert",
  "pattern": {
    "type": "multiple_failed_logins",
    "severity": "medium",
    "description": "Multiple failed login attempts from IP 192.168.1.1",
    "count": 15,
    "timeWindow": 900000,
    "detectedAt": "2025-01-01T00:00:00.000Z",
    "metadata": {
      "ipAddress": "192.168.1.1",
      "failureCount": 15,
      "timeWindow": 900000,
      "firstAttempt": "2025-01-01T00:00:00.000Z",
      "lastAttempt": "2025-01-01T00:15:00.000Z"
    }
  },
  "timestamp": "2025-01-01T00:15:00.000Z"
}
```

If `SECURITY_ALERTS_WEBHOOK_SECRET` is configured, the webhook includes an HMAC signature in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=<hmac_signature>
```

### Monitoring

Monitor security alerts via:

- Admin API endpoint (`/api/admin/security-alerts/check`)
- Application logs (pattern detection and alert sending)
- Email notifications (if configured)
- Webhook responses (if configured)
- SIEM dashboards (if SIEM integration is enabled)

### Troubleshooting

**Alerts not being sent:**

1. Verify `SECURITY_ALERTS_ENABLED=true` is set
2. Check alert channel configuration
3. Verify email recipients or webhook URL
4. Review application logs for errors
5. Test manually using `/api/admin/security-alerts/check`

**Too many false positives:**

1. Adjust threshold values (increase thresholds)
2. Adjust time windows (increase window duration)
3. Review detected patterns in logs
4. Fine-tune pattern detection logic

**Alerts not appearing in SIEM:**

1. Verify SIEM integration is configured
2. Check SIEM forwarding status
3. Review SIEM system logs
4. Verify network connectivity
