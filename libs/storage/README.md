# @anchorpipe/storage

MinIO/S3 helper utilities for anchorpipe services. Provides a thin wrapper around the `minio` SDK for creating clients, verifying connectivity, and common object operations used by ingestion and scoring pipelines.

## Installation

Consumed internally via workspace alias `@anchorpipe/storage`.

```ts
import {
  createMinioClient,
  checkMinioHealth,
  uploadFile,
  downloadFile,
  deleteFile,
} from '@anchorpipe/storage';
```

## Usage

```ts
const client = createMinioClient({
  endPoint: process.env.MINIO_ENDPOINT!,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  useSSL: false,
});

const healthy = await checkMinioHealth(client);
if (!healthy) throw new Error('Storage unavailable');

await uploadFile(client, {
  bucketName: 'artifacts',
  objectName: `reports/${reportId}.json`,
  data: JSON.stringify(report),
  contentType: 'application/json',
});
```

## Provided Helpers

| Function | Description |
| --- | --- |
| `createMinioClient(config)` | Returns a configured MinIO client. |
| `checkMinioHealth(client)` | Lightweight health-check by listing buckets. |
| `ensureBucketExists(client, bucket)` | Idempotently creates a bucket (us-east-1 region default). |
| `uploadFile(client, options)` | Uploads data (Buffer/String) ensuring bucket exists. |
| `downloadFile(client, bucket, object)` | Downloads object and returns a `Buffer`. |
| `deleteFile(client, bucket, object)` | Removes object from storage. |

## Conventions

- Buckets are created lazily in the `us-east-1` region; adjust if multi-region is required.
- Objects are uploaded with `application/octet-stream` fallback when no content type provided.
- Prefer storing JSON payloads as UTF-8 strings for traceability.

## Additional Documentation

- See [`STORAGE_CONVENTIONS.md`](STORAGE_CONVENTIONS.md) for naming, lifecycle, and compliance policies.

## Local Development

1. Start MinIO via `infra/docker-compose.yml` (`minio` service).
2. Export `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`.
3. Run storage smoke tests (TODO: add automated coverage under `libs/storage/__tests__`).
