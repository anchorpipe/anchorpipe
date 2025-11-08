# Server-Only Utilities

This directory contains utilities that are **server-only** and cannot be imported by client components.

## Purpose

This separation ensures:

- **Clear boundaries**: Server-only code (Node.js APIs, Prisma, etc.) is isolated from client-safe code
- **Build safety**: Prevents accidentally bundling server code into client bundles
- **Future-proofing**: When we migrate to dedicated Rust/Go services (per ADR-0007), server code is already separated

## What Belongs Here

Files in `lib/server/` use:

- Node.js APIs (`crypto`, `fs`, etc.)
- Prisma Client (database access)
- `next/headers` or `next/server` APIs
- Environment variables (`process.env`)
- Server-side only dependencies

## What Stays in `lib/`

Client-safe utilities that can be used in both server and client components:

- Pure functions (e.g., `base64.ts`)
- Zod schemas (e.g., `schemas/auth.ts`)
- Type definitions (e.g., `rbac.ts` - CASL abilities can be used client-side)
- Validation utilities (e.g., `validation.ts`)

## Import Pattern

**From API routes (server-only):**

```typescript
import { createSessionJwt } from '@/lib/server/auth';
import { writeAuditLog } from '@/lib/server/audit-service';
```

**From client components:**

```typescript
// ❌ DON'T - This will cause build errors
import { createSessionJwt } from '@/lib/server/auth';

// ✅ DO - Use client-safe utilities
import { validateEmail } from '@/lib/validation';
import { emailSchema } from '@/lib/schemas/auth';
```

## Internal Imports Within `lib/server/`

Files within this directory can import from each other using relative paths:

```typescript
// In lib/server/oauth-service.ts
import { encryptField } from './secrets';
import { createSessionJwt } from './auth';
```

To import from parent `lib/` directory:

```typescript
// In lib/server/rbac-service.ts
import { RepoRole } from '../rbac'; // rbac.ts is in lib/, not lib/server/
```

## Testing

Test files are organized in the `__tests__/` directory:

- `__tests__/oauth.test.ts` tests `oauth.ts`
- `__tests__/crypto.test.ts` tests `crypto.ts`
- `__tests__/audit-service.test.ts` tests `audit-service.ts`
- etc.

This organization keeps test files separate from source code while maintaining clear relationships. Tests import from parent directory using relative paths (e.g., `import { ... } from '../oauth'`).

## Related Documentation

- [ADR-0001: Core Backend Stack](../../../../adr/0001-core-backend-stack.md) - MVP BFF via Next.js
- [ADR-0007: Ingestion Cutover Criteria](../../../../adr/0007-ingestion-cutover-criteria.md) - Future migration to Rust/Go services
- [ADR-0013: Code Organization — Server/Client Separation](../../../../adr/0013-code-organization-server-client-separation.md) - This organizational pattern
- [Repository Structure Guide](../../../../anchorpipe_guide_docs/impo/repo-structure-guide.md)
