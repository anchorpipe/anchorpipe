# ADR-0013: Code Organization — Server/Client Separation in Next.js App

- Status: Proposed
- Date: 2025-11-08
- Deciders: anchorpipe Core Program (rick1330)

## Context

- Next.js App Router supports both server and client components, but mixing server-only code (Node.js APIs, Prisma, `next/headers`) with client-safe code risks:
  - Accidental bundling of server code into client bundles (increasing bundle size)
  - Build-time errors when server-only imports are used in client components
  - Unclear boundaries for developers about what can be used where
- ADR-0001 establishes Next.js as MVP BFF, with future migration to Rust/Go services (ADR-0007) when cutover criteria are met.
- Clear code organization is needed to:
  - Support the "clear separation of concerns" principle from ADR-0001
  - Prepare for future service extraction (per ADR-0007)
  - Prevent build errors and bundle bloat
  - Improve developer experience with explicit boundaries

## Decision

- **Server-only utilities** are organized in `apps/web/src/lib/server/`:
  - Files using Node.js APIs (`crypto`, `fs`, etc.)
  - Prisma Client and database access
  - `next/headers` or `next/server` APIs
  - Environment variables (`process.env`)
  - Server-side only dependencies
- **Client-safe utilities** remain in `apps/web/src/lib/`:
  - Pure functions (e.g., `base64.ts`)
  - Zod schemas (e.g., `schemas/auth.ts`)
  - Type definitions (e.g., `rbac.ts` - CASL abilities can be used client-side)
  - Validation utilities (e.g., `validation.ts`)
- **Test files** are organized in `__tests__/` directories:
  - `lib/__tests__/` for client-safe utility tests
  - `lib/server/__tests__/` for server-only utility tests
  - Tests import from parent directory using relative paths (e.g., `import { ... } from '../oauth'`)

## Consequences

### Positive

- **Clear boundaries**: Developers immediately understand what can be used in client vs. server contexts
- **Build safety**: Prevents accidentally bundling server code into client bundles, maintaining <100KB gz entry bundle budget (ADR-0006)
- **Future-proofing**: Server code is already separated, making extraction to Rust/Go services (ADR-0007) more straightforward
- **Developer experience**: Explicit import paths (`@/lib/server/...`) make server-only code obvious
- **Test organization**: `__tests__/` directories keep source code clean while maintaining clear test-to-source relationships

### Negative

- **Slightly longer import paths**: `@/lib/server/auth` instead of `@/lib/auth`
- **Requires discipline**: Developers must correctly categorize new utilities
- **Migration effort**: Existing code needed refactoring (completed)

### Neutral

- **No impact on runtime**: This is purely organizational; no performance or functionality changes
- **No impact on ADR-0001**: This decision supports, not changes, the Next.js BFF approach

## Alternatives Considered

1. **Co-location with naming convention** (e.g., `auth.server.ts`):
   - Rejected: Less discoverable, harder to enforce, doesn't prevent accidental imports
2. **Separate `lib/server/` and `lib/client/` directories**:
   - Rejected: Most utilities are server-only; client-safe code is the exception, not the rule
3. **No separation** (status quo):
   - Rejected: Risk of bundle bloat, unclear boundaries, harder future extraction

## Revisit Criteria

- If Next.js introduces better built-in mechanisms for server/client separation
- If bundle size analysis shows server code is still being bundled (indicating enforcement gaps)
- If future service extraction (ADR-0007) reveals this organization is insufficient

## References

- [ADR-0001: Core Backend Stack](0001-core-backend-stack.md) - MVP BFF via Next.js; clear separation of concerns
- [ADR-0006: Web Entry Bundle Budget](0006-web-entry-bundle-budget.md) - <100KB gz entry bundle requirement
- [ADR-0007: Ingestion Cutover Criteria](0007-ingestion-cutover-criteria.md) - Future migration to Rust/Go services
- [Repository Structure Guide](../anchorpipe_guide_docs/impo/repo-structure-guide.md) - General code organization patterns
- Implementation: `apps/web/src/lib/server/README.md` - Detailed usage guidelines
