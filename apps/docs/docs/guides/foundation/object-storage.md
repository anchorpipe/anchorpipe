# Object Storage (S3-compatible) (ST-107)

## Overview

Sets up S3-compatible object storage using MinIO for local development and cloud S3 for production. Stores large test artifacts and raw test reports without bloating the database.

## Architecture

Following ADR-0011:

- **Local/Dev**: MinIO (S3-compatible)
- **Production**: Cloud S3 (AWS S3, Cloudflare R2, etc.)
- **Encryption**: Server-side encryption with KMS keys
- **Bucket Layout**: `fr-artifacts/<env>/<repo_id>/<yyyy>/<mm>/<dd>/<run_id>/...`

## Configuration

### Local Development

MinIO runs via Docker Compose:

```yaml
storage:
  image: minio/minio:latest
  ports:
    - '9000:9000' # API
    - '9001:9001' # Console
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadminpassword
```

### Connection

```bash
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadminpassword
MINIO_USE_SSL=false
```

### Management Console

Access at: `http://localhost:9001`

- Username: `minioadmin`
- Password: `minioadminpassword`

## Usage

### Library

Location: `libs/storage/`

```typescript
import {
  createMinioClient,
  checkMinioHealth,
  ensureBucketExists,
  uploadFile,
  downloadFile,
  deleteFile,
} from '@anchorpipe/storage';
```

### Create Client

```typescript
const client = createMinioClient({
  endPoint: process.env.MINIO_ENDPOINT!,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  useSSL: process.env.MINIO_USE_SSL === 'true',
});
```

### Health Check

```typescript
const healthy = await checkMinioHealth(client);
if (!healthy) {
  throw new Error('Storage unavailable');
}
```

### Upload File

```typescript
await uploadFile(client, {
  bucketName: 'artifacts',
  objectName: `reports/${repoId}/${runId}/report.json`,
  data: JSON.stringify(report),
  contentType: 'application/json',
});
```

### Download File

```typescript
const buffer = await downloadFile(client, 'artifacts', `reports/${repoId}/${runId}/report.json`);
const report = JSON.parse(buffer.toString());
```

### Delete File

```typescript
await deleteFile(client, 'artifacts', `reports/${repoId}/${runId}/report.json`);
```

## Bucket Layout

Following ADR-0011:

```
fr-artifacts/
  <env>/              # dev, staging, prod
    <repo_id>/         # Repository UUID
      <yyyy>/          # Year
        <mm>/           # Month
          <dd>/         # Day
            <run_id>/   # CI run ID
              report.json
              artifacts/
```

## Conventions

- **Region**: `us-east-1` (default, adjust if multi-region needed)
- **Content Type**: `application/octet-stream` fallback if not provided
- **JSON Storage**: Prefer UTF-8 strings for JSON payloads
- **Lazy Bucket Creation**: Buckets created on first use

## Health Check

Endpoint: `GET /api/health/storage`

Checks MinIO/S3 connectivity and returns status.

## Production Considerations

### Encryption

- Server-side encryption enabled
- KMS-managed keys
- Encrypt at rest per compliance

### Lifecycle Policies

- Retention per compliance requirements
- Automatic deletion after retention period
- Archive to cheaper storage tiers

### Access Control

- IAM policies for bucket access
- Least privilege principle
- Separate credentials per service

### Monitoring

- Monitor storage usage
- Track upload/download rates
- Alert on errors
- Monitor bucket policies

## Future Enhancements

- Multi-region replication
- CDN integration
- Versioning
- Lifecycle policies automation
- Cost optimization (tiered storage)

## Related Documentation

- [ADR-0011](../../reference/adr/object-storage) - Object storage decision
- [Ingestion Worker](../services/ingestion-worker) - Artifact upload
