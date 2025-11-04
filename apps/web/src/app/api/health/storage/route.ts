import { NextResponse } from 'next/server';
import { createMinioClient, checkMinioHealth } from '@anchorpipe/storage';

export async function GET() {
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000;
  const useSSL = (process.env.MINIO_USE_SSL || 'false') === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadminpassword';

  try {
    const client = createMinioClient({ endPoint, port, useSSL, accessKey, secretKey });
    const ok = await checkMinioHealth(client);
    if (!ok) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}


