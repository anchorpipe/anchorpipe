# Basic Authentication System (ST-104)

## Overview

Implements user registration and login with password-based authentication. Users can create accounts, log in securely, and receive session tokens. Passwords are hashed using bcrypt, and sessions are managed via JWT tokens stored in HTTP-only cookies.

## Features

- User registration with email and password
- Email verification (token-based)
- Secure password hashing (bcrypt)
- Password reset functionality
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

**Response (with email verification):**

```json
{
  "ok": true,
  "message": "User registered successfully. Please check your email to verify your account."
}
```

**Status Codes:**

- `201` - Registration successful
- `400` - Validation error
- `409` - Email already exists
- `429` - Rate limit exceeded

**Note:** In development mode, the response includes `verificationToken` and `verificationUrl` for testing purposes.

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

### Password Reset Request

**POST** `/api/auth/password-reset/request`

Request a password reset token for a user account.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Status Codes:**

- `200` - Request processed (always returns success to prevent email enumeration)
- `400` - Validation error
- `429` - Rate limit exceeded

**Note:** In development mode, the response includes `token` and `resetUrl` for testing purposes.

### Password Reset Confirm

**POST** `/api/auth/password-reset/confirm`

Confirm password reset and update password.

**Request Body:**

```json
{
  "token": "verification-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**Response:**

```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Status Codes:**

- `200` - Password reset successful
- `400` - Invalid or expired token, or validation error
- `429` - Rate limit exceeded

### Email Verification

**POST** `/api/auth/verify-email`

Verify email address with verification token.

**Request Body:**

```json
{
  "token": "verification-token-from-email"
}
```

**Response:**

```json
{
  "message": "Email address verified successfully.",
  "verified": true
}
```

**Status Codes:**

- `200` - Email verified successfully
- `400` - Invalid or expired token
- `429` - Rate limit exceeded

### Resend Email Verification

**POST** `/api/auth/resend-verification`

Resend email verification token. Requires authentication.

**Request Body:**

None (uses authenticated user's email)

**Response:**

```json
{
  "message": "Verification email has been sent. Please check your email."
}
```

**Status Codes:**

- `200` - Verification email sent
- `401` - Unauthorized (not authenticated)
- `404` - User not found or email not set
- `429` - Rate limit exceeded

**Note:** In development mode, the response includes `verificationToken` and `verificationUrl` for testing purposes.

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
5. Create user record with `emailVerified: false`
6. Generate email verification token (24-hour expiration)
7. Queue verification email (for future email infrastructure)
8. Create session JWT
9. Set session cookie
10. Log audit event

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
- `config_updated` - Password reset requested/completed, email verification completed

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

## Password Reset Flow

1. User requests password reset via email
2. System generates secure token (hashed before storage)
3. Token sent via email (queued for future email infrastructure)
4. User confirms reset with token and new password
5. Password updated and token marked as used

### Password Reset Security

- Tokens are cryptographically secure (32-byte random)
- Tokens hashed with bcrypt (10 rounds) before storage
- Rate limiting prevents abuse
- Prevents email enumeration (always returns success)
- Invalidates existing tokens when new one is created
- Single-use tokens (marked as used after confirmation)
- Automatic token expiration (1 hour)

## Email Verification Flow

1. User registers account
2. System generates verification token (24-hour expiration)
3. Token sent via email (queued for future email infrastructure)
4. User clicks verification link or submits token
5. Email marked as verified in user preferences

### Email Verification Security

- Tokens are cryptographically secure (32-byte random)
- Rate limiting prevents abuse
- Single-use tokens (deleted after verification)
- Automatic token expiration (24 hours)
- Invalidates existing tokens when new one is created

## Future Enhancements

- Two-factor authentication (2FA)
- Account model migration (separate password provider)
- OAuth integration (see ST-207)
- Session refresh tokens
- Remember me functionality
- Email infrastructure for sending verification and reset emails

## Related Documentation

- [Input Validation](input-validation.md) - Validation rules
- [Rate Limiting](rate-limiting.md) - Rate limit details
- [OAuth Integration](../security/oauth.md) - OAuth authentication
- [Audit Logging](../security/audit-logging.md) - Audit log details
