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
