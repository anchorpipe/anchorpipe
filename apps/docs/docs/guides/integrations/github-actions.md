# GitHub Actions Integration

This guide shows you how to integrate Anchorpipe with GitHub Actions workflows.

## Overview

GitHub Actions is a CI/CD platform that allows you to automate workflows. This guide shows you how to submit test results to Anchorpipe after your tests complete.

## Prerequisites

- A GitHub repository with Actions enabled
- An Anchorpipe account with a repository configured
- HMAC secret from Anchorpipe (see [CI Integration Guide](ci-integration) for details)

## Setup

### 1. Add GitHub Secrets

Navigate to your repository settings → Secrets and variables → Actions, and add:

- `ANCHORPIPE_REPO_ID`: Your repository UUID from Anchorpipe
- `ANCHORPIPE_HMAC_SECRET`: Your HMAC secret from Anchorpipe

### 2. Create Workflow

Create a workflow file (e.g., `.github/workflows/submit-to-anchorpipe.yml`):

```yaml
name: Submit Test Results to Anchorpipe

on:
  workflow_run:
    workflows: ['Tests'] # Trigger after your test workflow completes
    types:
      - completed

jobs:
  submit-results:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Download test results
        uses: actions/download-artifact@v4
        with:
          name: test-results
          path: ./test-results

      - name: Compute HMAC signature
        id: hmac
        run: |
          PAYLOAD=$(cat test-results/results.json)
          SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "${{ secrets.ANCHORPIPE_HMAC_SECRET }}" | cut -d' ' -f2)
          echo "signature=$SIGNATURE" >> $GITHUB_OUTPUT

      - name: Submit to Anchorpipe
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.ANCHORPIPE_REPO_ID }}" \
            -H "X-FR-Sig: ${{ steps.hmac.outputs.signature }}" \
            -H "Content-Type: application/json" \
            -d @test-results/results.json \
            https://api.anchorpipe.dev/api/ingestion
```

## Alternative: Direct Integration

If you want to submit results directly from your test workflow:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --json --outputFile=test-results.json

      - name: Submit to Anchorpipe
        run: |
          PAYLOAD=$(cat test-results.json)
          SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "${{ secrets.ANCHORPIPE_HMAC_SECRET }}" | cut -d' ' -f2)
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.ANCHORPIPE_REPO_ID }}" \
            -H "X-FR-Sig: $SIGNATURE" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" \
            https://api.anchorpipe.dev/api/ingestion
```

## Using GitHub Actions Marketplace

You can also use a GitHub Action from the marketplace (if available) to simplify the integration:

```yaml
- name: Submit to Anchorpipe
  uses: anchorpipe/github-action@v1
  with:
    repo-id: ${{ secrets.ANCHORPIPE_REPO_ID }}
    hmac-secret: ${{ secrets.ANCHORPIPE_HMAC_SECRET }}
    results-file: test-results.json
```

## Best Practices

1. **Use workflow_run triggers** for cleaner separation of concerns
2. **Store test results as artifacts** before submitting
3. **Handle failures gracefully** - don't fail the workflow if submission fails
4. **Use matrix builds** to submit results from multiple test jobs
5. **Add retry logic** for transient network errors

## Troubleshooting

### Signature Mismatch

If you're getting 401 errors, check:

- Secret is correctly set in GitHub Secrets (no extra spaces)
- Payload matches exactly what was signed
- Signature is hex-encoded (64 characters)

### Workflow Not Triggering

- Ensure the workflow name in `workflow_run.workflows` matches exactly
- Check that the triggering workflow completes (not cancelled)

## Related Documentation

- [CI Integration Guide](ci-integration) - General authentication and API details
- [GitHub App Integration](github-app) - Alternative integration using GitHub App
