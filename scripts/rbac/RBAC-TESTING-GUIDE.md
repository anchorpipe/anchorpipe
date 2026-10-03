# RBAC API Testing Guide

This guide explains how to test the RBAC (Role-Based Access Control) API endpoints.

## Prerequisites

1. **Database is running**: Ensure PostgreSQL is running and migrations are applied

   ```bash
   cd libs/database
   npx prisma migrate deploy
   ```

2. **Dev server is running**: Start the Next.js development server

   ```bash
   cd apps/web
   npm run dev
   ```

   The server should be running on `http://localhost:3001`

3. **Test data**: You'll need:
   - At least one user account (register via `/api/auth/register`)
   - At least one repository ID (create via your repo creation endpoint, or use an existing one)

## API Endpoints

### 1. List Users with Roles

**GET** `/api/repos/[repoId]/roles`

**Headers:**

- Cookie: Session cookie (from login)

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
        "name": "User Name",
        "githubLogin": "username"
      }
    }
  ]
}
```

### 2. Assign/Update Role

**POST** `/api/repos/[repoId]/roles`

**Headers:**

- Cookie: Session cookie
- Content-Type: application/json

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

### 3. Remove Role

**DELETE** `/api/repos/[repoId]/roles`

**Headers:**

- Cookie: Session cookie
- Content-Type: application/json

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

### 4. Get Audit Logs

**GET** `/api/repos/[repoId]/roles/audit?limit=50`

**Headers:**

- Cookie: Session cookie

**Query Parameters:**

- `limit` (optional): Number of logs to return (default: 50)

**Response:**

```json
{
  "logs": [
    {
      "id": "log-id",
      "actorId": "actor-user-id",
      "targetUserId": "target-user-id",
      "repoId": "repo-id",
      "action": "assigned" | "updated" | "removed",
      "oldRole": "admin" | null,
      "newRole": "member" | null,
      "actor": { ... },
      "targetUser": { ... },
      "createdAt": "2024-11-07T..."
    }
  ]
}
```

## Testing with Scripts

### PowerShell (Windows)

```powershell
.\scripts\test-rbac-api.ps1
```

### Bash (Linux/Mac)

```bash
./scripts/test-rbac-api.sh
```

## Manual Testing with curl

### 1. Register a user

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  -c cookies.txt
```

### 3. Get user info

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt
```

### 4. Assign admin role

```bash
curl -X POST http://localhost:3001/api/repos/REPO_ID/roles \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","role":"admin"}' \
  -b cookies.txt
```

### 5. List users with roles

```bash
curl -X GET http://localhost:3001/api/repos/REPO_ID/roles \
  -b cookies.txt
```

### 6. Get audit logs

```bash
curl -X GET http://localhost:3001/api/repos/REPO_ID/roles/audit \
  -b cookies.txt
```

### 7. Remove role

```bash
curl -X DELETE http://localhost:3001/api/repos/REPO_ID/roles \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID"}' \
  -b cookies.txt
```

## Testing Scenarios

### Scenario 1: First User Becomes Admin

1. Register a new user
2. Login
3. Assign admin role to yourself (you'll need to do this via direct DB insert or have a bootstrap endpoint)
4. Verify you can assign roles to other users

### Scenario 2: Role Hierarchy

1. Create user A with admin role
2. Create user B with member role
3. Create user C with read_only role
4. Test that:
   - Admin can assign/remove roles
   - Member cannot assign/remove roles
   - Read-only cannot modify anything

### Scenario 3: Audit Logging

1. Assign a role
2. Update the role
3. Remove the role
4. Check audit logs to verify all actions are logged

## Expected Behavior

### Permissions

- **Admin**: Can read, write, manage, and admin (assign/remove roles)
- **Member**: Can read and write, but cannot manage roles
- **Read-only**: Can only read

### Error Responses

- **401 Unauthorized**: User is not authenticated
- **403 Forbidden**: User doesn't have required permissions
- **400 Bad Request**: Invalid request body or missing required fields

## Troubleshooting

### "Property 'userRepoRole' does not exist"

- Run `npx prisma generate` in `libs/database`
- Restart the TypeScript server in your IDE

### "Unauthorized" errors

- Make sure you're logged in and the session cookie is being sent
- Check that the session contains `sub` field with user ID

### "Forbidden" errors

- Verify the user has the required role for the repository
- Check that the repoId in the URL matches the repoId in the role assignment

### Database errors

- Ensure migrations are applied: `npx prisma migrate deploy`
- Check database connection string in `.env`
