# GitHub App Integration

## Overview

This document describes the implementation of GitHub App integration for Anchorpipe, allowing users to install the app on their repositories and receive webhook events for test runs.

**Story**: ST-301  
**Status**: Implemented  
**Priority**: P0

## Features

- **GitHub App Installation**: Users can install the anchorpipe GitHub App on their repositories
- **Webhook Event Handling**: Automatically receives and processes installation, uninstallation, and repository events
- **Installation Management**: API endpoints for listing and managing installations
- **Audit Logging**: All installation events are logged for security monitoring
- **Signature Verification**: Webhook signatures are verified using HMAC-SHA256

## Architecture

### Flow Diagram

```
GitHub → Webhook Event → Signature Verification → Event Processing → Database Update → Audit Log
```

### Components

1. **Webhook Handler** (`/api/webhooks/github-app`)
   - Receives GitHub App webhook events
   - Verifies webhook signatures
   - Processes installation/uninstallation events
   - Updates installation records

2. **GitHub App Service** (`github-app-service.ts`)
   - Manages installation lifecycle (create, update, delete)
   - Provides functions for querying installations
   - Handles repository list updates

3. **Installation API** (`/api/github-app/installations`)
   - Lists all installations
   - Gets installation by ID
   - Filters by account login

4. **Database Schema** (`GitHubAppInstallation`)
   - Stores installation metadata
   - Tracks repository access
   - Records suspension status

## Setup

### 1. Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in:
   - **GitHub App name**: Anchorpipe (or your app name)
   - **Homepage URL**: `https://anchorpipe.dev`
   - **Webhook URL**: `https://api.anchorpipe.dev/api/webhooks/github-app`
   - **Webhook secret**: Generate a secure random string (store in `GITHUB_APP_WEBHOOK_SECRET`)
   - **Permissions**:
     - **Metadata**: Read-only
     - **Contents**: Read-only (if needed for test file access)
     - **Pull requests**: Read-only (if needed for PR comments)
   - **Subscribe to events**:
     - `installation`
     - `installation_repositories`
4. Click "Create GitHub App"
5. Note the **App ID** and generate a **Private key** (store securely)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
GITHUB_APP_PRIVATE_KEY=your_private_key_pem
```

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add_github_app_installations --schema libs/database/prisma/schema.prisma
```

### 4. Configure Webhook in GitHub

1. Go to your GitHub App settings
2. Navigate to "Webhooks"
3. Ensure the webhook URL is set to: `https://api.anchorpipe.dev/api/webhooks/github-app`
4. Verify the webhook secret matches `GITHUB_APP_WEBHOOK_SECRET`

## Usage

### Installing the App

1. Users navigate to the GitHub App installation page
2. Click "Install" on the desired repository or organization
3. GitHub sends an `installation.created` webhook event
4. The webhook handler processes the event and creates an installation record

### Listing Installations

```bash
# Get all installations
curl -H "Authorization: Bearer $TOKEN" \
  https://api.anchorpipe.dev/api/github-app/installations

# Get installations for a specific account
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.anchorpipe.dev/api/github-app/installations?account=testuser"

# Get a specific installation
curl -H "Authorization: Bearer $TOKEN" \
  https://api.anchorpipe.dev/api/github-app/installations/123456
```

### Webhook Events

The app handles the following webhook events:

- **`installation.created`**: New installation created
- **`installation.deleted`**: Installation removed
- **`installation.suspend`**: Installation suspended
- **`installation.unsuspend`**: Installation unsuspended
- **`installation_repositories.added`**: Repositories added to installation
- **`installation_repositories.removed`**: Repositories removed from installation

## API Reference

### GET /api/github-app/installations

List all GitHub App installations.

**Query Parameters:**

- `account` (optional): Filter by account login

**Response:**

```json
{
  "installations": [
    {
      "id": "uuid",
      "installationId": "123456",
      "accountLogin": "testuser",
      "accountType": "User",
      "repositoryCount": 2,
      "suspendedAt": null,
      "createdAt": "2025-11-09T00:00:00Z"
    }
  ]
}
```

### GET /api/github-app/installations/[installationId]

Get a specific GitHub App installation.

**Response:**

```json
{
  "installation": {
    "id": "uuid",
    "installationId": "123456",
    "accountId": "789",
    "accountType": "User",
    "accountLogin": "testuser",
    "targetType": "User",
    "targetId": null,
    "repositoryIds": ["1", "2"],
    "permissions": {
      "metadata": "read",
      "contents": "read"
    },
    "events": ["push", "pull_request"],
    "suspendedAt": null,
    "suspendedBy": null,
    "suspendedReason": null,
    "createdAt": "2025-11-09T00:00:00Z",
    "updatedAt": "2025-11-09T00:00:00Z"
  }
}
```

## Security

### Webhook Signature Verification

All webhook events are verified using HMAC-SHA256 signatures:

1. GitHub computes `HMAC-SHA256(body, webhook_secret)`
2. Sends signature in `X-Hub-Signature-256` header
3. Server verifies signature before processing events

### Authentication

All API endpoints require authentication via session cookies.

## Testing

### Unit Tests

Run unit tests for the GitHub App service:

```bash
npm test -- github-app-service.test.ts
```

### Integration Tests

To test webhook handling:

1. Use GitHub's webhook testing tool
2. Send test events to the webhook endpoint
3. Verify installation records are created/updated

## Troubleshooting

### Webhook Not Received

- Verify webhook URL is correct in GitHub App settings
- Check webhook secret matches `GITHUB_APP_WEBHOOK_SECRET`
- Ensure webhook endpoint is publicly accessible
- Check server logs for signature verification errors

### Installation Not Created

- Verify webhook signature is valid
- Check database connection
- Review audit logs for errors
- Ensure Prisma migration has been run

### Signature Verification Fails

- Verify `GITHUB_APP_WEBHOOK_SECRET` matches GitHub App settings
- Check webhook payload is not modified (e.g., by proxy)
- Ensure raw request body is used for signature verification

## Related Documentation

- [GitHub App Documentation](https://docs.github.com/en/apps)
- [Webhook Events](https://docs.github.com/en/apps/webhooks/webhook-events-and-payloads)
- [API Gateway Guide](../foundation/api-gateway.md)
- [Authentication Guide](../foundation/authentication.md)
