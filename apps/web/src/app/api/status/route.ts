import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function check(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.INTERNAL_SELF_BASE_URL || 'http://localhost:3000'}${path}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.ok);
  } catch {
    return false;
  }
}

export async function GET() {
  const [dbOk, mqOk, storageOk] = await Promise.all([
    check('/api/health/db'),
    check('/api/health/mq'),
    check('/api/health/storage'),
  ]);
  const ok = dbOk && mqOk && storageOk;
  return NextResponse.json(
    {
      ok,
      services: {
        db: dbOk,
        mq: mqOk,
        storage: storageOk,
      },
    },
    { status: ok ? 200 : 503 }
  );
}


