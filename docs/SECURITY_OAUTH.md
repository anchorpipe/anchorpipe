# OAuth 2.0 GitHub Integration

## Overview

This document describes the implementation of OAuth 2.0 GitHub integration for Anchorpipe, allowing users to authenticate using their GitHub credentials instead of creating and managing a separate password.

**Story**: ST-207  
**Status**: Implemented  
**Priority**: P0

## Features

- **OAuth 2.0 Authorization Code Flow with PKCE**: Secure authentication flow using Proof Key for Code Exchange
- **Account Linking**: Automatically links GitHub accounts to existing users by email
- **Token Encryption**: OAuth tokens are encrypted at rest using AES-256-GCM
- **Session Management**: Creates secure JWT sessions after successful authentication
- **Audit Logging**: All OAuth authentication events are logged for security monitoring

## Architecture

### Flow Diagram

```
User → Login Page → GitHub OAuth → GitHub Authorization → Callback → Token Exchange → User Profile → Account Linking → Session Creation → Dashboard
```

### Components

1. **OAuth Initiation** (`/api/auth/oauth/github`)
   - Generates PKCE code verifier and state
   - Stores values in secure HTTP-only cookies
   - Redirects to GitHub authorization page

2. **OAuth Callback** (`/api/auth/callback/github`)
   - Validates state (CSRF protection)
   - Exchanges authorization code for access token
   - Fetches user profile from GitHub
   - Links or creates user account
   - Creates session and redirects to dashboard

3. **Account Linking Service** (`oauth-service.ts`)
   - Handles three scenarios:
     - Existing OAuth account: Updates tokens and user info
     - Existing user by email: Links GitHub account
     - New user: Creates user and OAuth account

## Setup

### 1. Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Anchorpipe (or your app name)
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Required for token encryption (from ST-202)
ENCRYPTION_KEY_BASE64=your_base64_encoded_32_byte_key

# Required for session management
AUTH_SECRET=your_auth_secret_at_least_16_chars
```

### 3. Generate Encryption Key

If you haven't already set up encryption (from ST-202), generate a 32-byte key:

```bash
# Generate a random 32-byte key and encode to base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output to `ENCRYPTION_KEY_BASE64`.

## API Endpoints

### GET `/api/auth/oauth/github`

Initiates the OAuth flow by redirecting to GitHub.

**Query Parameters:**

- `return_to` (optional): URL to redirect to after successful login (default: `/dashboard`)

**Response:**

- Redirects to GitHub authorization page

**Example:**

```
GET /api/auth/oauth/github?return_to=/dashboard
```

### GET `/api/auth/callback/github`

Handles the OAuth callback from GitHub.

**Query Parameters:**

- `code`: Authorization code from GitHub
- `state`: State token for CSRF protection
- `error` (optional): Error code from GitHub
- `error_description` (optional): Error description from GitHub

**Response:**

- Redirects to dashboard on success
- Redirects to login page with error on failure

## Security Features

### PKCE (Proof Key for Code Exchange)

- **Code Verifier**: Random 32-byte value, base64url-encoded
- **Code Challenge**: SHA256 hash of verifier, base64url-encoded
- **Method**: S256 (SHA256)
- Prevents authorization code interception attacks

### CSRF Protection

- **State Token**: Random 32-byte value stored in HTTP-only cookie
- **Validation**: State from callback must match stored value
- Prevents cross-site request forgery attacks

### Token Security

- **Encryption**: OAuth tokens encrypted at rest using AES-256-GCM
- **Storage**: Tokens stored in `accounts` table with encrypted fields
- **Transmission**: Tokens transmitted over HTTPS only

### Session Security

- **JWT Tokens**: Signed with `AUTH_SECRET`
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Flag**: Enabled in production
- **SameSite**: Lax (prevents CSRF)

## User Experience

### Login Flow

1. User clicks "Sign in with GitHub" on login page
2. Redirected to GitHub authorization page
3. User authorizes the application
4. Redirected back to Anchorpipe
5. Automatically logged in and redirected to dashboard

### Account Linking

- **Existing OAuth Account**: User is logged in, tokens updated
- **Existing Email**: GitHub account is linked to existing user account
- **New User**: New user account is created with GitHub profile

## Error Handling

### Common Errors

1. **Invalid State**: State mismatch (possible CSRF attack)
   - Redirects to login with error message
   - Logged as security event

2. **Token Exchange Failure**: Invalid or expired authorization code
   - Redirects to login with error message
   - Logged as authentication failure

3. **GitHub API Error**: Failed to fetch user profile
   - Redirects to login with error message
   - Logged as authentication failure

### Error Messages

Errors are displayed to users via URL query parameters:

- `error=oauth_error&message=...`
- `error=invalid_state&message=...`
- `error=oauth_failed&message=...`

## Audit Logging

All OAuth events are logged to the audit log:

- **login_success**: Successful OAuth login
- **login_failure**: Failed OAuth authentication
- **user_created**: New user created via OAuth

Log entries include:

- User ID (if available)
- GitHub ID and login
- IP address and user agent
- Error details (for failures)

## Testing

### Unit Tests

Run unit tests for OAuth utilities:

```bash
npm test -- oauth.test.ts
npm test -- base64.test.ts
```

### Manual Testing

1. **First-time Login**:
   - Click "Sign in with GitHub"
   - Authorize on GitHub
   - Verify new user account created
   - Verify session created

2. **Returning User**:
   - Click "Sign in with GitHub"
   - Authorize on GitHub
   - Verify existing account used
   - Verify tokens updated

3. **Account Linking**:
   - Create account with email/password
   - Log in with GitHub using same email
   - Verify accounts linked

4. **Error Cases**:
   - Cancel GitHub authorization
   - Test with invalid state
   - Test with expired code

## Troubleshooting

### "GITHUB_CLIENT_ID must be set"

- Ensure `GITHUB_CLIENT_ID` is set in environment variables
- Restart the application after setting environment variables

### "GITHUB_CLIENT_SECRET must be set"

- Ensure `GITHUB_CLIENT_SECRET` is set in environment variables
- Verify the secret matches the GitHub OAuth app

### "ENCRYPTION_KEY_BASE64 must be set"

- Ensure encryption key is configured (see ST-202 documentation)
- Key must be base64-encoded 32-byte value

### "State mismatch" Error

- Usually indicates CSRF attack or expired OAuth flow
- Verify cookies are enabled in browser
- Check that OAuth flow completes within 10 minutes

### Token Exchange Fails

- Verify callback URL matches GitHub OAuth app configuration
- Check that authorization code hasn't expired (codes expire quickly)
- Verify client ID and secret are correct

## Future Enhancements

- **Token Refresh**: Implement refresh token rotation
- **Multiple Providers**: Support Google, GitLab, etc.
- **Account Management**: UI to link/unlink OAuth accounts
- **Email Verification**: Verify email when linking accounts
- **Profile Sync**: Periodic sync of GitHub profile data

## Related Documentation

- [ST-202: Data Encryption](./SECURITY_ENCRYPTION.md) - Token encryption
- [ST-206: Audit Logging](./SECURITY_AUDIT.md) - Authentication logging
- [ST-104: Basic Authentication](./) - Session management

## References

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
