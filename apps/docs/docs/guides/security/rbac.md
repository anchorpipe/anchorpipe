---
sidebar_position: 7
sidebar_label: 'Role-Based Access Control (ST-201)'
---

# Role-Based Access Control (ST-201)

## Overview

Implements repository-level role-based access control (RBAC) using CASL for permission management. Three roles are defined: `admin`, `member`, and `read_only`, each with distinct permissions for repository resources.

## Roles and Permissions

### Admin Role

- **Read**: All resources (repo, test_case, test_run, config, role, audit)
- **Write**: Repository resources (repo, test_case, test_run, config)
- **Manage**: Repository resources (repo, test_case, test_run, config)
- **Admin**: Role and configuration management

### Member Role

- **Read**: Repository resources (repo, test_case, test_run, config)
- **Write**: Repository resources (repo, test_case, test_run, config)
- **Cannot**: Manage roles or perform admin actions

### Read-Only Role

- **Read**: Repository resources (repo, test_case, test_run, config)
- **Cannot**: Write, manage, or perform admin actions

## Data Model

- `UserRepoRole` table links users to repositories with roles
- `RoleAuditLog` table tracks all role changes
- Unique constraint on `userId` + `repoId` combination
- Indexed for efficient role lookups

## API Endpoints

### List Users with Roles

**GET** `/api/repos/[repoId]/roles`

Returns all users with their roles for a repository.

**Response:**

```json
{
  "users": [
    {
      "id": "user-id",
      "userId": "user-id",
      "repoId": "repo-id",
      "role": "admin",
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "name": "User Name"
      }
    }
  ]
}
```

### Assign/Update Role

**POST** `/api/repos/[repoId]/roles`

Assigns or updates a user's role in a repository.

**Body:**

```json
{
  "userId": "user-uuid",
  "role": "admin" | "member" | "read_only"
}
```

**Response:**

```json
{
  "message": "Role assigned successfully",
  "userId": "user-uuid",
  "role": "admin"
}
```

### Remove Role

**DELETE** `/api/repos/[repoId]/roles`

Removes a user's role from a repository.

**Body:**

```json
{
  "userId": "user-uuid"
}
```

**Response:**

```json
{
  "message": "Role removed successfully",
  "userId": "user-uuid"
}
```

### Get Audit Logs

**GET** `/api/repos/[repoId]/roles/audit?limit=50`

Returns role change audit logs for a repository.

**Query Parameters:**

- `limit` (optional): Number of logs to return (default: 50)

**Response:**

```json
{
  "logs": [
    {
      "id": "log-id",
      "userId": "user-id",
      "repoId": "repo-id",
      "action": "assigned" | "removed",
      "role": "admin",
      "actorId": "actor-user-id",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Usage

### Check Permissions

```typescript
import { getUserAbility, can } from '@/lib/server/rbac-service';

const ability = await getUserAbility(userId, repoId);

if (can(ability, 'read', 'repo')) {
  // User can read repository
}

if (can(ability, 'admin', 'role')) {
  // User can manage roles
}
```

### Require Permission

```typescript
import { requireAuthz } from '@/lib/server/authz';

// In API route handler
await requireAuthz(request, 'admin', 'role', repoId);
// Throws error if permission denied
```

### Assign Default Role

```typescript
import { assignDefaultRole, RepoRole } from '@/lib/rbac-defaults';

// Assign default member role to new user
await assignDefaultRole(userId, repoId, RepoRole.MEMBER);
```

## Implementation Details

### Permission System

- Uses CASL (Isomorphic Authorization) for permission management
- Type-safe permission checks with TypeScript
- Ability instances created per user/repository combination

### Service Layer

Location: `apps/web/src/lib/server/rbac-service.ts`

- `getUserRepoRole()` - Get user's role for a repository
- `getUserAbility()` - Get CASL ability instance
- `assignRole()` - Assign/update role with audit logging
- `removeRole()` - Remove role with audit logging
- `getRepoUsers()` - List all users with roles
- `getRoleAuditLogs()` - Get audit logs
- `userHasAdminRole()` - Check if user is admin

### Authorization Middleware

Location: `apps/web/src/lib/server/authz.ts`

- `getAuthzContext()` - Extract user/repo from session
- `requireAuthz()` - Enforce permissions (throws on denial)

## Audit Logging

All role changes are logged to audit logs:

- `role_assigned` - When a role is assigned
- `role_removed` - When a role is removed

Audit logs include:

- Actor (who made the change)
- Target user
- Repository
- Role assigned/removed
- Timestamp

## Testing

### Unit Tests

Location: `apps/web/src/lib/__tests__/rbac.test.ts`

Tests cover:

- Permission checks for each role
- Ability creation
- Permission denial scenarios

### Integration Tests

Location: `apps/web/src/lib/server/__tests__/rbac-service.test.ts`

Tests cover:

- Role assignment and removal
- Audit log creation
- Permission enforcement

## Operations

- Default roles assigned to new repository members (configurable)
- Role changes immediately reflected (no caching)
- Audit logs are immutable (append-only)
- Role removal does not delete user from repository

## Future Enhancements

- Custom roles with configurable permissions
- Permission inheritance from organization level
- Role templates for common permission sets
- Time-based role assignments (temporary roles)
