---
sidebar_position: 1
sidebar_label: 'API Gateway / BFF (ST-105)'
---

# API Gateway / BFF (ST-105)

## Overview

Implements the Backend for Frontend (BFF) pattern using Next.js Route Handlers. Provides a unified API layer for the web application, handling authentication, authorization, validation, and data aggregation.

## Architecture

Following ADR-0001, the BFF is implemented as:

- **Next.js Route Handlers** on Vercel (MVP)
- REST-first API design
- Type-safe with TypeScript
- Validated with Zod schemas

## API Structure

All API routes are under `/api/*`:

```
/api/
├── auth/              # Authentication endpoints
├── ingestion/         # CI ingestion endpoint
├── repos/            # Repository management
├── dsr/               # Data subject requests
├── audit-logs/        # Audit log queries
├── health/            # Health checks
├── metrics/           # Prometheus metrics
└── version/           # API version
```

## Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user info
- `GET /api/auth/oauth/github` - GitHub OAuth initiation
- `GET /api/auth/callback/github` - GitHub OAuth callback

### Ingestion

- `POST /api/ingestion` - Submit test reports (HMAC authenticated)

### Repositories

- `GET /api/repos/[repoId]/roles` - List users with roles
- `POST /api/repos/[repoId]/roles` - Assign role
- `DELETE /api/repos/[repoId]/roles` - Remove role
- `GET /api/repos/[repoId]/roles/audit` - Role audit logs

### Data Subject Requests

- `GET /api/dsr` - List DSR requests
- `POST /api/dsr/export` - Request data export
- `GET /api/dsr/export/[requestId]` - Download export
- `POST /api/dsr/deletion` - Request account deletion

### Health & Monitoring

- `GET /api/health/db` - Database health
- `GET /api/health/mq` - Message queue health
- `GET /api/health/storage` - Object storage health
- `GET /api/status` - Overall system status
- `GET /api/metrics` - Prometheus metrics
- `GET /api/version` - API version

## Request Flow

1. **Middleware** - Security headers, request ID generation
2. **Authentication** - Session validation (if required)
3. **Authorization** - Permission checks (RBAC)
4. **Validation** - Request body validation (Zod)
5. **Rate Limiting** - Rate limit enforcement
6. **Business Logic** - Service layer processing
7. **Response** - JSON response with appropriate status

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "details": [] // Optional, development only
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

## Validation

All endpoints use Zod schemas for validation:

```typescript
import { validateRequest } from '@/lib/validation';
import { registerSchema } from '@/lib/schemas/auth';

const result = await validateRequest(request, registerSchema);
if (!result.success) {
  return NextResponse.json({ error: result.error.error }, { status: 400 });
}
```

## Authentication

### Session-Based

- JWT tokens in HTTP-only cookies
- Automatic session validation
- Middleware extracts user from session

### HMAC (CI Systems)

- `Authorization: Bearer <repo_id>`
- `X-FR-Sig: <hmac_signature>`
- Used for ingestion endpoint

## Authorization

RBAC enforced via middleware:

```typescript
import { requireAuthz } from '@/lib/server/authz';

await requireAuthz(request, 'admin', 'role', repoId);
```

## Rate Limiting

Applied per endpoint:

- `auth:register` - 5 requests / 15 minutes
- `auth:login` - 10 requests / 15 minutes
- `ingestion:submit` - 500 requests / hour

## Response Headers

All responses include:

- `X-Request-ID` - Request identifier
- `X-RateLimit-Limit` - Rate limit maximum
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp
- Security headers (see ST-204)

## Future Enhancements

- GraphQL endpoint (optional)
- API versioning (`/api/v1/`)
- Request/response logging
- OpenAPI documentation generation
- API key authentication
- Webhook endpoints

## Related Documentation

- [Authentication](authentication.md) - Auth endpoints
- [Input Validation](../security/input-validation.md) - Validation
- [Rate Limiting](../security/rate-limiting.md) - Rate limits
- [RBAC](../security/rbac.md) - Authorization
