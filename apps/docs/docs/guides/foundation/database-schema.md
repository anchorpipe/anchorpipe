---
sidebar_position: 4
sidebar_label: 'Database Schema (ST-102)'
---

# Database Schema (ST-102)

## Overview

Implements the foundational PostgreSQL database schema using Prisma ORM. Includes core tables for users, repositories, test cases, test runs, flake scores, and supporting entities.

## Core Tables

### Repo

Stores repository information.

- `id` - UUID primary key
- `ghId` - GitHub repository ID (unique)
- `name` - Repository name
- `owner` - Repository owner
- `defaultBranch` - Default branch (default: "main")
- `visibility` - Repository visibility (public/private)
- `config` - JSONB configuration
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### User

Stores user accounts.

- `id` - UUID primary key
- `githubId` - GitHub user ID (unique, nullable)
- `githubLogin` - GitHub username (nullable)
- `email` - User email (nullable)
- `name` - Display name (nullable)
- `createdAt` - Account creation timestamp
- `lastLoginAt` - Last login timestamp
- `telemetryOptIn` - Telemetry opt-in flag
- `preferences` - JSONB user preferences

### TestCase

Stores test case metadata.

- `id` - UUID primary key
- `repoId` - Foreign key to repos
- `name` - Test name
- `framework` - Testing framework
- `filePath` - Test file path
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### TestRun

Stores test run results.

- `id` - UUID primary key
- `repoId` - Foreign key to repos
- `testCaseId` - Foreign key to test_cases
- `commitSha` - Git commit SHA
- `runId` - CI run identifier
- `status` - Test status (passed/failed/skipped)
- `duration` - Test duration (milliseconds)
- `failureDetails` - JSONB failure details
- `createdAt` - Run timestamp

### FlakeScore

Stores flake detection scores.

- `id` - UUID primary key
- `testCaseId` - Foreign key to test_cases
- `score` - Flake score (0-100)
- `confidence` - Confidence level
- `factors` - JSONB contributing factors
- `calculatedAt` - Calculation timestamp

## Authentication Tables

### Account

OAuth account linkage.

- `id` - UUID primary key
- `userId` - Foreign key to users
- `provider` - OAuth provider (e.g., "github")
- `providerAccountId` - Provider user ID
- `accessToken` - Encrypted access token
- `refreshToken` - Encrypted refresh token
- `expiresAt` - Token expiration timestamp

### Session

User sessions.

- `id` - UUID primary key
- `userId` - Foreign key to users
- `sessionToken` - JWT session token (unique)
- `expires` - Session expiration timestamp
- `createdAt` - Session creation timestamp

## RBAC Tables

### UserRepoRole

Repository role assignments.

- `id` - UUID primary key
- `userId` - Foreign key to users
- `repoId` - Foreign key to repos
- `role` - Role enum (admin/member/read_only)
- `createdAt` - Assignment timestamp

### RoleAuditLog

Role change audit trail.

- `id` - UUID primary key
- `userId` - Target user ID
- `repoId` - Repository ID
- `action` - Action (assigned/removed)
- `role` - Role assigned/removed
- `actorId` - User who made the change
- `createdAt` - Change timestamp

## Security Tables

### AuditLog

Security audit logs.

- `id` - UUID primary key
- `actorId` - User who performed action
- `action` - Action enum (login_success, role_assigned, etc.)
- `subject` - Subject enum (user, repo, security, etc.)
- `subjectId` - Subject identifier
- `description` - Action description
- `metadata` - JSONB metadata
- `ipAddress` - Request IP address
- `userAgent` - Request user agent
- `createdAt` - Log timestamp

### HmacSecret

HMAC secrets for CI authentication.

- `id` - UUID primary key
- `repoId` - Foreign key to repos
- `name` - Secret name
- `secretHash` - Hashed secret value
- `active` - Active flag
- `revoked` - Revoked flag
- `lastUsedAt` - Last usage timestamp
- `createdAt` - Creation timestamp
- `revokedAt` - Revocation timestamp
- `expiresAt` - Expiration timestamp
- `rotatedFrom` - Previous secret ID (rotation)

## DSR Tables

### DataSubjectRequest

Data subject requests (GDPR/CCPA).

- `id` - UUID primary key
- `userId` - Foreign key to users
- `type` - Request type (export/deletion)
- `status` - Request status (pending/processing/completed/failed)
- `exportData` - JSONB export payload
- `dueAt` - SLA deadline
- `processedAt` - Processing timestamp
- `createdAt` - Request timestamp

### DataSubjectRequestEvent

DSR event timeline.

- `id` - UUID primary key
- `requestId` - Foreign key to data_subject_requests
- `status` - Event status
- `notes` - Event notes
- `createdAt` - Event timestamp

## Indexes

- Primary keys on all tables
- Foreign key indexes
- Unique constraints where needed
- Composite indexes for common queries
- GIN indexes on JSONB fields

## Migrations

Prisma migrations are versioned and reversible:

```bash
npm run db:migrate        # Apply migrations
npm run db:migrate:deploy # Deploy to production
```

Migration files: `libs/database/prisma/migrations/`

## Schema Management

### Generate Prisma Client

```bash
npm run db:generate
```

### View Schema

```bash
npm run db:studio
```

Opens Prisma Studio for database browsing.

## Related Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Authentication](authentication.md) - Auth tables
- [RBAC](../security/rbac.md) - Role tables
