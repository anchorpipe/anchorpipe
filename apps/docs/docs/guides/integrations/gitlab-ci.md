# GitLab CI Integration

This guide shows you how to integrate Anchorpipe with GitLab CI/CD pipelines.

## Overview

GitLab CI/CD uses `.gitlab-ci.yml` files to define pipelines. This guide shows you how to submit test results to Anchorpipe after your tests complete.

## Prerequisites

- A GitLab project with CI/CD enabled
- An Anchorpipe account with a repository configured
- HMAC secret from Anchorpipe (see [CI Integration Guide](ci-integration) for details)

## Setup

### 1. Add CI/CD Variables

Navigate to your project → Settings → CI/CD → Variables, and add:

- `ANCHORPIPE_REPO_ID`: Your repository UUID from Anchorpipe
- `ANCHORPIPE_HMAC_SECRET`: Your HMAC secret from Anchorpipe (mark as masked and protected)

### 2. Add Job to Pipeline

Add a job to your `.gitlab-ci.yml`:

```yaml
submit_results:
  stage: deploy
  image: curlimages/curl:latest
  before_script:
    - |
      SIGNATURE=$(echo -n "$(cat test-results.json)" | openssl dgst -sha256 -hmac "$ANCHORPIPE_HMAC_SECRET" | cut -d' ' -f2)
  script:
    - |
      curl -X POST \
        -H "Authorization: Bearer $ANCHORPIPE_REPO_ID" \
        -H "X-FR-Sig: $SIGNATURE" \
        -H "Content-Type: application/json" \
        -d @test-results.json \
        https://api.anchorpipe.dev/api/ingestion
  only:
    - main
    - merge_requests
  artifacts:
    when: always
    paths:
      - test-results.json
```

## Complete Example

```yaml
stages:
  - test
  - submit

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test -- --json --outputFile=test-results.json
  artifacts:
    paths:
      - test-results.json
    expire_in: 1 hour

submit_results:
  stage: submit
  image: curlimages/curl:latest
  dependencies:
    - test
  before_script:
    - |
      SIGNATURE=$(echo -n "$(cat test-results.json)" | openssl dgst -sha256 -hmac "$ANCHORPIPE_HMAC_SECRET" | cut -d' ' -f2)
  script:
    - |
      curl -X POST \
        -H "Authorization: Bearer $ANCHORPIPE_REPO_ID" \
        -H "X-FR-Sig: $SIGNATURE" \
        -H "Content-Type: application/json" \
        -d @test-results.json \
        https://api.anchorpipe.dev/api/ingestion
  only:
    - main
    - merge_requests
```

## Using Docker Image

For better performance, you can use a custom Docker image with curl and openssl:

```yaml
submit_results:
  stage: submit
  image: alpine:latest
  before_script:
    - apk add --no-cache curl openssl
    - |
      SIGNATURE=$(echo -n "$(cat test-results.json)" | openssl dgst -sha256 -hmac "$ANCHORPIPE_HMAC_SECRET" | cut -d' ' -f2)
  script:
    - |
      curl -X POST \
        -H "Authorization: Bearer $ANCHORPIPE_REPO_ID" \
        -H "X-FR-Sig: $SIGNATURE" \
        -H "Content-Type: application/json" \
        -d @test-results.json \
        https://api.anchorpipe.dev/api/ingestion
```

## Best Practices

1. **Use artifacts** to pass test results between jobs
2. **Mark secrets as protected** to prevent exposure in merge requests
3. **Use only/except** to control when results are submitted
4. **Add error handling** to prevent pipeline failures
5. **Use parallel jobs** for multiple test suites

## Troubleshooting

### Variable Not Found

- Ensure variables are set in project settings
- Check that variables are not protected if running on unprotected branches
- Verify variable names match exactly (case-sensitive)

### Signature Error

- Verify the secret is correctly set (no extra spaces)
- Ensure the payload matches exactly what was signed
- Check that openssl is available in the image

## Related Documentation

- [CI Integration Guide](ci-integration) - General authentication and API details
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/) - Official GitLab CI/CD docs
