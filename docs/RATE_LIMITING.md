# Rate Limiting and Brute Force Protection (ST-210)

## Overview

Implements comprehensive rate limiting and brute force protection to prevent abuse and attacks on authentication and API endpoints. Rate limits are applied per endpoint and user/IP, with configurable limits and trusted source bypass rules.

## Features

- **Rate Limiting**: Per-endpoint rate limits with configurable thresholds
- **Brute Force Protection**: Automatic account/IP locking after repeated failed login attempts
- **Violation Logging**: All rate limit violations are logged to audit logs
- **Environment Configuration**: Rate limits configurable via environment variables
- **Trusted Source Bypass**: Optional IP whitelist for trusted sources
- **Standard Headers**: `X-RateLimit-*` headers and `Retry-After` on violations

## Rate Limits

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `auth:register` | 5 requests | 15 minutes |
| `auth:login` | 10 requests | 15 minutes |
| `ingestion:submit` | 500 requests | 1 hour |

### Configuration

Rate limits can be configured via environment variables:

```bash
# Format: "maxRequests:windowMs"
RATE_LIMIT_AUTH_REGISTER=5:900000      # 5 requests per 15 minutes
RATE_LIMIT_AUTH_LOGIN=10:900000       # 10 requests per 15 minutes
RATE_LIMIT_INGESTION_SUBMIT=500:3600000  # 500 requests per hour
```

## Brute Force Protection

### Configuration

Brute force protection is configured via environment variables:

```bash
BRUTE_FORCE_MAX_ATTEMPTS=5              # Max failed attempts before lock
BRUTE_FORCE_LOCK_DURATION_MS=900000     # Lock duration (15 minutes)
BRUTE_FORCE_WINDOW_MS=900000            # Tracking window (15 minutes)
```

### Behavior

- Tracks failed login attempts by IP and email combination
- Locks account/IP after 5 failed attempts (default)
- Lock duration: 15 minutes (default)
- Tracking window: 15 minutes (default)
- Automatically clears on successful login
- Expires after tracking window ends

## Trusted Source Bypass

Trusted IPs can bypass rate limiting (optional feature):

```bash
TRUSTED_IPS=192.168.1.1,10.0.0.1,172.16.0.1
```

**Security Note**: Only use trusted IPs for internal services or known-good sources. This feature should be used sparingly and documented.

## HTTP Headers

### Rate Limit Headers

All responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets

### Retry-After Header

When rate limit is exceeded (429 status), the response includes:

- `Retry-After`: Number of seconds to wait before retrying

## API Responses

### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests. Please try again later."
}
```

Headers:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000000
Retry-After: 900
```

### Brute Force Lock (429)

```json
{
  "error": "Account temporarily locked due to repeated failed login attempts. Please try again later."
}
```

Headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
```

## Implementation Details

### Rate Limiting Service

Location: `apps/web/src/lib/server/rate-limit.ts`

- In-memory rate limiter (for MVP)
- Per-IP tracking
- Automatic cleanup of expired entries
- Configurable via environment variables
- Trusted source bypass support

### Brute Force Protection Service

Location: `apps/web/src/lib/server/brute-force.ts`

- In-memory tracking of failed attempts
- Per-IP and per-email tracking
- Automatic lock expiration
- Periodic cleanup of expired entries

### Integration Points

- **Login Endpoint** (`/api/auth/login`): Rate limiting + brute force protection
- **Register Endpoint** (`/api/auth/register`): Rate limiting
- **Ingestion Endpoint** (`/api/ingestion`): Rate limiting

## Audit Logging

All rate limit violations are logged to audit logs:

```typescript
{
  action: 'login_failure',
  subject: 'security',
  description: 'Rate limit violation: auth:login exceeded for IP 192.168.1.1',
  metadata: { key: 'auth:login', ip: '192.168.1.1' },
  ipAddress: '192.168.1.1',
  userAgent: '...'
}
```

Brute force locks are also logged:

```typescript
{
  action: 'login_failure',
  subject: 'security',
  description: 'Brute force lock: Account locked due to repeated failed attempts',
  metadata: { email: 'user@example.com', ip: '192.168.1.1', retryAfter: 900 },
  ipAddress: '192.168.1.1',
  userAgent: '...'
}
```

## Production Considerations

### Redis-Based Rate Limiting

For production, consider migrating to Redis-based rate limiting:

- Distributed rate limiting across multiple instances
- Persistent rate limit state
- Better performance for high-traffic scenarios
- Shared state across load-balanced servers

### Monitoring

Monitor rate limit violations and brute force locks:

- Track violation rates by endpoint
- Alert on unusual patterns
- Monitor lock frequency
- Review audit logs for suspicious activity

### Performance

- In-memory rate limiting is fast but doesn't scale across instances
- Consider Redis for multi-instance deployments
- Rate limit checks are synchronous (blocking)
- Cleanup runs periodically to prevent memory leaks

## Testing

### Unit Tests

Location: `apps/web/src/lib/server/__tests__/rate-limit.test.ts`

Tests cover:
- Rate limit enforcement
- Header generation
- Retry-After calculation
- Trusted source bypass
- Configuration via environment variables

### Integration Tests

Location: `apps/web/src/lib/server/__tests__/brute-force.test.ts`

Tests cover:
- Failed attempt tracking
- Lock expiration
- Clear on successful login
- Window expiration

## Troubleshooting

### Rate Limits Too Strict

Adjust limits via environment variables:

```bash
RATE_LIMIT_AUTH_LOGIN=20:900000  # Increase to 20 requests per 15 minutes
```

### Brute Force Locks Too Aggressive

Adjust brute force configuration:

```bash
BRUTE_FORCE_MAX_ATTEMPTS=10     # Increase to 10 attempts before lock
BRUTE_FORCE_LOCK_DURATION_MS=600000  # Reduce lock to 10 minutes
```

### Trusted Sources Being Rate Limited

Add IPs to trusted list:

```bash
TRUSTED_IPS=192.168.1.1,10.0.0.1
```

## Related Documentation

- [Security Audit Logging](SECURITY_AUDIT.md) - Audit log details
- [HMAC Authentication](CI_INTEGRATION.md) - CI system authentication
- [API Documentation](../README.md) - General API documentation

## Future Enhancements

- Redis-based rate limiting for production
- Per-user rate limits (in addition to per-IP)
- Adaptive rate limiting based on user behavior
- Rate limit exemptions for specific user roles
- Integration with WAF/CDN for edge rate limiting

