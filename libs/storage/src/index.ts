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


