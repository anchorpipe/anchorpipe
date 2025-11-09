# Basic Authentication System (ST-104)

## Overview

Implements user registration and login with password-based authentication. Users can create accounts, log in securely, and receive session tokens. Passwords are hashed using bcrypt, and sessions are managed via JWT tokens stored in HTTP-only cookies.

## Features

- User registration with email and password
- Secure password hashing (bcrypt)
- Session management with JWT tokens
- HTTP-only session cookies
- Rate limiting on authentication endpoints
- Brute force protection
- Audit logging for authentication events

## API Endpoints

### Register

**POST** `/api/auth/register`

Creates a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "ok": true
}
```

**Status Codes:**

- `201` - Registration successful
- `400` - Validation error
- `409` - Email already exists
- `429` - Rate limit exceeded

### Login

**POST** `/api/auth/login`

Authenticates a user and creates a session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "ok": true
}
```

**Status Codes:**

- `200` - Login successful
- `400` - Validation error
- `401` - Invalid credentials
- `429` - Rate limit exceeded or account locked

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters

## Security Features

### Password Hashing

- Uses bcrypt with configurable rounds
- Passwords are never stored in plain text
- Hash stored in user preferences (temporary, will migrate to Account model)

### Session Management

- JWT tokens with expiration
- HTTP-only cookies (prevents XSS)
- Secure flag in production (HTTPS only)
- SameSite=Lax for CSRF protection

### Rate Limiting

- Registration: 5 requests per 15 minutes
- Login: 10 requests per 15 minutes
- Configurable via environment variables

### Brute Force Protection

- Tracks failed login attempts by IP and email
- Locks account after 5 failed attempts (default)
- Lock duration: 15 minutes (default)
- Automatically clears on successful login

## Implementation Details

### Registration Flow

1. Validate request body (Zod schema)
2. Check rate limits
3. Verify email doesn't exist
4. Hash password with bcrypt
5. Create user record
6. Create session JWT
7. Set session cookie
8. Log audit event

### Login Flow

1. Validate request body (Zod schema)
2. Check rate limits
3. Check brute force lock status
4. Find user by email
5. Verify password hash
6. Record failed attempt if invalid
7. Update last login timestamp
8. Create session JWT
9. Set session cookie
10. Log audit event

## Data Model

### User Table

- `id` - UUID primary key
- `email` - User email (optional, nullable)
- `preferences` - JSONB field storing password hash temporarily
- `createdAt` - Account creation timestamp
- `lastLoginAt` - Last successful login timestamp

### Session Table

- `id` - UUID primary key
- `userId` - Foreign key to users
- `sessionToken` - JWT token string
- `expires` - Token expiration timestamp
- `createdAt` - Session creation timestamp

## Environment Variables

```bash
# JWT secret for signing tokens
JWT_SECRET=your-secret-key

# Session expiration (seconds)
SESSION_EXPIRES_IN=86400  # 24 hours

# Bcrypt rounds
BCRYPT_ROUNDS=10
```

## Usage

### Register a User

```typescript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});
```

### Login

```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

// Session cookie is automatically set
```

### Check Authentication

```typescript
import { getSession } from '@/lib/server/auth';

const session = await getSession(request);
if (session) {
  // User is authenticated
  const userId = session.sub;
}
```

## Audit Logging

All authentication events are logged:

- `user_created` - User registration
- `login_success` - Successful login
- `login_failure` - Failed login attempt

Audit logs include:

- User ID (if available)
- IP address
- User agent
- Timestamp
- Metadata (email, reason for failure)

## Testing

### Unit Tests

Location: `apps/web/src/lib/server/__tests__/password.test.ts`

Tests cover:

- Password hashing
- Password verification
- Invalid password handling

### Integration Tests

Location: `apps/web/src/app/api/auth/__tests__/`

Tests cover:

- Registration flow
- Login flow
- Error handling
- Rate limiting
- Brute force protection

## Future Enhancements

- Password reset functionality
- Email verification
- Two-factor authentication (2FA)
- Account model migration (separate password provider)
- OAuth integration (see ST-207)
- Session refresh tokens
- Remember me functionality

## Related Documentation

- [Input Validation](input-validation.md) - Validation rules
- [Rate Limiting](rate-limiting.md) - Rate limit details
- [OAuth Integration](../security/oauth.md) - OAuth authentication
- [Audit Logging](../security/audit-logging.md) - Audit log details
