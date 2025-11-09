# Telemetry and Logging (ST-108)

## Overview

Implements basic telemetry and logging infrastructure for monitoring application health, performance, and usage. Includes structured logging, Prometheus metrics, and telemetry event tracking.

## Logging

### Structured Logging

Location: `apps/web/src/lib/server/logger.ts`

```typescript
import { logger } from '@/lib/server/logger';

logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error });
logger.warn('Rate limit approaching', { endpoint: '/api/ingestion' });
```

### Log Levels

- `fatal` - System is unusable
- `error` - Error events
- `warn` - Warning events
- `info` - Informational messages
- `debug` - Debug messages
- `trace` - Trace messages

### Configuration

```bash
LOG_LEVEL=info  # fatal, error, warn, info, debug, trace
```

### Log Format

Structured JSON logs with:

- Timestamp
- Level
- Message
- Metadata (optional)
- Request ID (when available)

## Metrics

### Prometheus Metrics

Location: `apps/web/src/lib/server/metrics.ts`

Exposed at: `GET /api/metrics`

### Default Metrics

- CPU usage
- Memory usage
- Event loop lag
- Active handles
- Active requests

### Custom Metrics

```typescript
import { httpRequestDurationMs } from '@/lib/server/metrics';

// Record request duration
const start = Date.now();
// ... handle request ...
httpRequestDurationMs.observe({ method: 'POST', route: '/api/ingestion' }, Date.now() - start);
```

### Metric Types

- **Histogram**: Request duration, response sizes
- **Counter**: Request counts, error counts
- **Gauge**: Active connections, queue depth

## Telemetry Events

### Event Tracking

Location: `apps/web/src/lib/server/telemetry.ts`

```typescript
import { recordTelemetry } from '@/lib/server/telemetry';

await recordTelemetry({
  eventType: 'test.run.completed',
  properties: {
    repoId: 'repo-123',
    runId: 'run-456',
    testCount: 100,
  },
  requestId: 'req-789',
});
```

### Event Storage

Events stored in `telemetry_events` table:

- `eventType` - Event identifier
- `eventData` - JSONB event payload
- `repoId` - Repository ID (optional)
- `userId` - User ID (optional)
- `eventTimestamp` - Event timestamp

### Privacy

- No PII in telemetry events
- Only structural fields allowed
- User opt-in required (`telemetryOptIn`)

### Configuration

```bash
TELEMETRY_ENABLED=true  # Enable telemetry
```

## Request Context

### Request ID

Every request gets a unique ID:

- Generated in middleware
- Included in logs and metrics
- Passed to telemetry events

### Context Extraction

```typescript
import { extractRequestContext } from '@/lib/server/audit-service';

const context = extractRequestContext(request);
// { ipAddress, userAgent, requestId }
```

## Health Monitoring

### Status Endpoint

`GET /api/status`

Returns overall system health:

- Database connectivity
- Message queue connectivity
- Object storage connectivity
- Service status

### Health Endpoints

- `GET /api/health/db` - Database health
- `GET /api/health/mq` - Message queue health
- `GET /api/health/storage` - Object storage health

## Observability

### Log Aggregation

- Structured JSON logs
- Console output (development)
- Future: Centralized log aggregation (ELK, Datadog, etc.)

### Metrics Collection

- Prometheus-compatible metrics
- Scraped by monitoring system
- Future: Grafana dashboards

### Distributed Tracing

- Request ID propagation
- Future: OpenTelemetry integration

## Best Practices

1. **Use appropriate log levels**
   - `error` for errors requiring attention
   - `warn` for recoverable issues
   - `info` for important events
   - `debug` for development debugging

2. **Include context**
   - Request ID
   - User ID (when available)
   - Repository ID (when relevant)

3. **Avoid PII**
   - No emails, passwords, tokens
   - Hash sensitive identifiers
   - Sanitize user input

4. **Structured logging**
   - Use metadata objects
   - Consistent field names
   - JSON format

## Future Enhancements

- Centralized log aggregation
- Grafana dashboards
- Alerting rules
- OpenTelemetry integration
- Log retention policies
- Telemetry event streaming to MQ

## Related Documentation

- [Audit Logging](../security/audit-logging.md) - Security audit logs
- [Project Setup](project-setup.md) - Local development
- [API Gateway](api-gateway.md) - API endpoints
