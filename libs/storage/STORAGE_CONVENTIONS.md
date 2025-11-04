# Storage Key Naming Conventions

This document defines the key (object name) naming conventions for AnchorPipe's S3-compatible object storage.

## Bucket Structure

- **Primary bucket**: `anchorpipe-artifacts` (default)
- **Environment-specific buckets**: `anchorpipe-artifacts-{env}` (e.g., `anchorpipe-artifacts-staging`)

## Key Naming Pattern

```
{category}/{repo_id}/{run_id}/{filename}
```

### Pattern Components

- **`category`**: Type of artifact (e.g., `test-reports`, `raw-artifacts`, `processed`)
- **`repo_id`**: Repository identifier (GitHub repo ID or UUID)
- **`run_id`**: CI/CD run identifier (GitHub Actions run ID or equivalent)
- **`filename`**: Original filename or generated identifier with extension

### Examples

```
test-reports/123456/789012/jest-results.json
test-reports/123456/789012/junit.xml
raw-artifacts/123456/789012/playwright-report.zip
processed/123456/789012/parsed-test-results.json
```

## Categories

### `test-reports/`

Raw test report files from CI/CD systems (JUnit XML, Jest JSON, PyTest JSON, etc.)

### `raw-artifacts/`

Large binary artifacts or compressed archives (e.g., screenshots, videos, logs)

### `processed/`

Processed or transformed data derived from raw artifacts

## Rules

1. **Use forward slashes (`/`) as path separators** - Standard S3 convention
2. **No leading slashes** - Keys should not start with `/`
3. **Use lowercase** - All category names and identifiers should be lowercase
4. **Use hyphens for separators** - In category names and filenames, use hyphens (e.g., `test-reports`, not `test_reports`)
5. **Preserve file extensions** - Include original file extensions for content type inference
6. **URL-safe identifiers** - Use alphanumeric characters, hyphens, and underscores only
7. **No trailing slashes** - Keys should not end with `/` (except for "directory" listings)

## Content Types

Default content types per category:

- **`test-reports/*.xml`**: `application/xml` or `text/xml`
- **`test-reports/*.json`**: `application/json`
- **`raw-artifacts/*.zip`**: `application/zip`
- **`raw-artifacts/*.tar.gz`**: `application/gzip`
- **`processed/*.json`**: `application/json`

## Retention

- **Test reports**: 30 days (configurable)
- **Raw artifacts**: 7 days (configurable)
- **Processed data**: 90 days (configurable)

## Migration Notes

When migrating from one storage system to another, maintain the same key structure to ensure compatibility.
