# CircleCI Integration

This guide shows you how to integrate Anchorpipe with CircleCI workflows.

## Overview

CircleCI is a cloud-based CI/CD platform. This guide shows you how to submit test results to Anchorpipe from CircleCI workflows.

## Prerequisites

- A CircleCI project
- An Anchorpipe account with a repository configured
- HMAC secret from Anchorpipe (see [CI Integration Guide](ci-integration) for details)

## Setup

### 1. Add Environment Variables

Navigate to your project → Settings → Environment Variables, and add:

- `ANCHORPIPE_REPO_ID`: Your repository UUID from Anchorpipe
- `ANCHORPIPE_HMAC_SECRET`: Your HMAC secret from Anchorpipe

### 2. Add Job to Workflow

Add a job to your `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Run tests
          command: npm test -- --json --outputFile=test-results.json
      - persist_to_workspace:
          root: .
          paths:
            - test-results.json

  submit-results:
    docker:
      - image: cimg/base:stable
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Compute HMAC signature
          command: |
            SIGNATURE=$(echo -n "$(cat test-results.json)" | openssl dgst -sha256 -hmac "$ANCHORPIPE_HMAC_SECRET" | cut -d' ' -f2)
            echo "export SIGNATURE=$SIGNATURE" >> $BASH_ENV
      - run:
          name: Submit to Anchorpipe
          command: |
            curl -X POST \
              -H "Authorization: Bearer $ANCHORPIPE_REPO_ID" \
              -H "X-FR-Sig: $SIGNATURE" \
              -H "Content-Type: application/json" \
              -d @test-results.json \
              https://api.anchorpipe.dev/api/ingestion

workflows:
  test-and-submit:
    jobs:
      - test
      - submit-results:
          requires:
            - test
          filters:
            branches:
              only:
                - main
```

## Complete Example

```yaml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-dependencies-{{ checksum "package-lock.json" }}
            - v1-dependencies-
      - run:
          name: Install dependencies
          command: npm ci
      - save_cache:
          paths:
            - node_modules
          key: v1-dependencies-{{ checksum "package-lock.json" }}
      - run:
          name: Run tests
          command: npm test -- --json --outputFile=test-results.json
      - store_test_results:
          path: test-results.json
      - persist_to_workspace:
          root: .
          paths:
            - test-results.json

  submit-results:
    docker:
      - image: cimg/base:stable
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install curl and openssl
          command: |
            apt-get update && apt-get install -y curl openssl
      - run:
          name: Compute HMAC signature
          command: |
            SIGNATURE=$(echo -n "$(cat test-results.json)" | openssl dgst -sha256 -hmac "$ANCHORPIPE_HMAC_SECRET" | cut -d' ' -f2)
            echo "export SIGNATURE=$SIGNATURE" >> $BASH_ENV
      - run:
          name: Submit to Anchorpipe
          command: |
            curl -X POST \
              -H "Authorization: Bearer $ANCHORPIPE_REPO_ID" \
              -H "X-FR-Sig: $SIGNATURE" \
              -H "Content-Type: application/json" \
              -d @test-results.json \
              https://api.anchorpipe.dev/api/ingestion

workflows:
  test-and-submit:
    jobs:
      - test
      - submit-results:
          requires:
            - test
          filters:
            branches:
              only:
                - main
                - develop
```

## Using Orbs

You can create a reusable orb for Anchorpipe integration:

```yaml
version: 2.1

orbs:
  anchorpipe: your-org/anchorpipe@1.0.0

workflows:
  test-and-submit:
    jobs:
      - test
      - anchorpipe/submit:
          results-file: test-results.json
          requires:
            - test
```

## Best Practices

1. **Use workspaces** to pass test results between jobs
2. **Store test results** for CircleCI test insights
3. **Use filters** to control when results are submitted
4. **Add error handling** to prevent workflow failures
5. **Use caching** to speed up builds

## Troubleshooting

### Environment Variables Not Found

- Verify variables are set in project settings
- Check that variables are not restricted to specific contexts
- Ensure variable names match exactly

### OpenSSL Not Available

- Use `cimg/base:stable` image which includes openssl
- Or install openssl in your custom image
- Consider using a CircleCI orb for HMAC computation

## Related Documentation

- [CI Integration Guide](ci-integration) - General authentication and API details
- [CircleCI Documentation](https://circleci.com/docs/) - Official CircleCI docs
