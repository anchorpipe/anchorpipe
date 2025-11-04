import { Client } from 'minio';

export type MinioConfig = {
  endPoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
};

export function createMinioClient(config: MinioConfig): Client {
  return new Client({
    endPoint: config.endPoint,
    port: config.port ?? (config.useSSL ? 443 : 9000),
    useSSL: config.useSSL ?? false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
}

export async function checkMinioHealth(client: Client): Promise<boolean> {
  try {
    // List buckets as a simple liveness check
    await client.listBuckets();
    return true;
  } catch {
    return false;
  }
}

export async function ensureBucketExists(client: Client, bucketName: string): Promise<void> {
  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1');
  }
}

export async function uploadFile(
  client: Client,
  bucketName: string,
  objectName: string,
  data: Buffer | string,
  contentType?: string
): Promise<void> {
  await ensureBucketExists(client, bucketName);
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  await client.putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': contentType || 'application/octet-stream',
  });
}

export async function downloadFile(
  client: Client,
  bucketName: string,
  objectName: string
): Promise<Buffer> {
  const stream = await client.getObject(bucketName, objectName);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFile(
  client: Client,
  bucketName: string,
  objectName: string
): Promise<void> {
  await client.removeObject(bucketName, objectName);
}
