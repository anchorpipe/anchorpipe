---
sidebar_position: 1
sidebar_label: 'CI Integration Guide'
---

# CI Integration Guide

This guide explains how to integrate Anchorpipe with your CI/CD pipeline using HMAC authentication.

## Overview

Anchorpipe uses HMAC-SHA256 authentication to securely receive test reports from CI systems. Each repository requires an HMAC secret that is used to sign request payloads.

## Authentication

All ingestion requests must include:

1. **Authorization Header**: `Authorization: Bearer <repo_id>`
   - The repository ID (UUID) that identifies your repository in Anchorpipe

2. **X-FR-Sig Header**: `X-FR-Sig: <hmac_signature>`
   - HMAC-SHA256 signature of the request body
   - Computed using your repository's HMAC secret

## Getting Your HMAC Secret

1. Log in to Anchorpipe as a repository admin
2. Navigate to your repository settings
3. Go to the "CI Integration" section
4. Create a new HMAC secret (or use an existing one)
5. **Important**: Copy the secret immediately - it will not be shown again

## Computing HMAC Signatures

The HMAC signature is computed as:

```
HMAC-SHA256(secret, request_body)
```

The result should be hex-encoded and sent in the `X-FR-Sig` header.

## Platform-Specific Guides

Choose your CI/CD platform for detailed integration instructions:

- **[GitHub Actions](github-actions)** - Integrate with GitHub Actions workflows
- **[GitLab CI](gitlab-ci)** - Integrate with GitLab CI/CD pipelines
- **[Jenkins](jenkins)** - Integrate with Jenkins pipelines
- **[CircleCI](circleci)** - Integrate with CircleCI workflows

## Using Programming Languages

### Python

```python
import hmac
import hashlib
import requests
import os

def submit_test_results(payload: str, repo_id: str, secret: str):
    # Compute HMAC signature
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Submit to Anchorpipe
    response = requests.post(
        'https://api.anchorpipe.dev/api/ingestion',
        headers={
            'Authorization': f'Bearer {repo_id}',
            'X-FR-Sig': signature,
            'Content-Type': 'application/json',
        },
        data=payload,
    )

    return response.json()

# Usage
with open('test-results.json', 'r') as f:
    payload = f.read()

result = submit_test_results(
    payload,
    os.environ['ANCHORPIPE_REPO_ID'],
    os.environ['ANCHORPIPE_HMAC_SECRET']
)
print(result)
```

### Node.js

```javascript
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

function submitTestResults(payload, repoId, secret) {
  // Compute HMAC signature
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Submit to Anchorpipe
  const options = {
    hostname: 'api.anchorpipe.dev',
    path: '/api/ingestion',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${repoId}`,
      'X-FR-Sig': signature,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Usage
const payload = fs.readFileSync('test-results.json', 'utf8');
submitTestResults(payload, process.env.ANCHORPIPE_REPO_ID, process.env.ANCHORPIPE_HMAC_SECRET).then(
  console.log
);
```

### Bash/Shell

```bash
#!/bin/bash

REPO_ID="${ANCHORPIPE_REPO_ID}"
SECRET="${ANCHORPIPE_HMAC_SECRET}"
PAYLOAD_FILE="test-results.json"
API_URL="https://api.anchorpipe.dev/api/ingestion"

# Read payload
PAYLOAD=$(cat "$PAYLOAD_FILE")

# Compute HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Submit to Anchorpipe
curl -X POST \
  -H "Authorization: Bearer $REPO_ID" \
  -H "X-FR-Sig: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$API_URL"
```

## Rate Limiting

The ingestion endpoint is rate-limited to **500 requests per hour per repository**. If you exceed this limit, you'll receive a `429 Too Many Requests` response with:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets
- `Retry-After`: Number of seconds to wait before retrying

## Error Handling

### 401 Unauthorized

- Missing or invalid `Authorization` header
- Missing or invalid `X-FR-Sig` header
- Invalid HMAC signature

### 413 Payload Too Large

- Request body exceeds 50MB limit

### 429 Too Many Requests

- Rate limit exceeded (see above)

### 500 Internal Server Error

- Server error - retry after a delay

## Security Best Practices

1. **Never commit secrets to version control**
   - Use CI/CD platform secrets/variables
   - Use environment variables
   - Rotate secrets regularly

2. **Use separate secrets for different environments**
   - Production, staging, and development should have different secrets

3. **Rotate secrets periodically**
   - Use the admin API to rotate secrets
   - Update CI/CD configurations with new secrets
   - Revoke old secrets after rotation

4. **Monitor secret usage**
   - Check `lastUsedAt` timestamp in admin dashboard
   - Revoke unused secrets

5. **Use HTTPS only**
   - Always use `https://api.anchorpipe.dev`
   - Never send secrets over unencrypted connections

## Troubleshooting

### Invalid Signature Error

**Problem**: Receiving 401 with "Invalid HMAC signature"

**Solutions**:

1. Verify the secret is correct (no extra spaces, correct encoding)
2. Ensure the payload matches exactly what was signed
3. Check that the signature is hex-encoded (64 characters, lowercase)
4. Verify the payload encoding (UTF-8)

### Rate Limit Exceeded

**Problem**: Receiving 429 Too Many Requests

**Solutions**:

1. Reduce submission frequency
2. Batch multiple test runs into a single request
3. Implement exponential backoff retry logic
4. Contact support to request higher limits

### Secret Not Found

**Problem**: Receiving 401 with "No active HMAC secrets found"

**Solutions**:

1. Verify the repository ID is correct
2. Check that the secret is active (not revoked)
3. Ensure the secret hasn't expired
4. Create a new secret if needed

## API Reference

### Endpoint

```
POST /api/ingestion
```

### Headers

| Header          | Required | Description                         |
| --------------- | -------- | ----------------------------------- |
| `Authorization` | Yes      | `Bearer <repo_id>`                  |
| `X-FR-Sig`      | Yes      | HMAC-SHA256 signature (hex-encoded) |
| `Content-Type`  | Yes      | `application/json`                  |

### Request Body

JSON payload containing test results in the standardized Anchorpipe format. The payload must match the `IngestionPayload` schema:

```json
{
  "repo_id": "550e8400-e29b-41d4-a716-446655440000",
  "commit_sha": "a1b2c3d4e5f6789012345678901234567890abcd",
  "run_id": "ci-run-12345",
  "framework": "jest",
  "tests": [
    {
      "path": "src/utils.test.ts",
      "name": "should work",
      "status": "pass",
      "durationMs": 100,
      "startedAt": "2025-01-01T00:00:00.000Z",
      "tags": ["unit"],
      "metadata": {}
    }
  ],
  "branch": "main",
  "pull_request": "123",
  "environment": {
    "CI": "github-actions",
    "NODE_VERSION": "20"
  }
}
```

#### Supported Test Frameworks

Anchorpipe supports parsing test reports from the following frameworks:

- **Jest** (`jest`) - JavaScript/TypeScript testing framework
- **PyTest** (`pytest`) - Python testing framework
- **Playwright** (`playwright`) - End-to-end testing framework
- **JUnit** (`junit`) - Java testing framework (XML format)
- **Mocha** (`mocha`) - JavaScript testing framework
- **Vitest** (`vitest`) - Fast Vite-native unit test framework

#### Test Report Format

Each test case in the `tests` array must include:

- `path` (string, 1-500 chars): File path where the test is located
- `name` (string, 1-500 chars): Test name/description
- `status` (enum): `"pass"`, `"fail"`, or `"skip"`
- `startedAt` (string): ISO 8601 datetime when the test started
- `durationMs` (number, optional): Test duration in milliseconds
- `failureDetails` (string, optional, max 10000 chars): Error message/details for failed tests
- `tags` (array of strings, optional): Test tags/categories
- `metadata` (object, optional): Additional framework-specific metadata

**Note**: When using the GitHub App integration, test reports are automatically parsed from common formats (JUnit XML, Jest JSON, PyTest JSON, Playwright JSON). For direct API submissions, you must format your payload according to the schema above.

### Response

```json
{
  "runId": "run-1234567890-abc123",
  "message": "Test report received",
  "summary": {
    "tests_parsed": 42,
    "flaky_candidates": 3
  }
}
```

## Support

For additional help:

- Check the [documentation](https://anchorpipe-docs.vercel.app)
- Open an issue on [GitHub](https://github.com/anchorpipe/anchorpipe/issues)
- Contact support: support@anchorpipe.dev
