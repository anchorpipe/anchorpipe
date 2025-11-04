import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger, nowMs, durationMs } from '@/lib/logger';
import { recordTelemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function check(path: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.INTERNAL_SELF_BASE_URL || 'http://localhost:3000'}${path}`,
      {
        cache: 'no-store',
      }
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.ok);
  } catch {
    return false;
  }
}

export async function GET() {
  const h = headers();
  const requestId = h.get('x-request-id') || undefined;
  const start = nowMs();
  logger.info('GET /api/status start', { requestId });
  const [dbOk, mqOk, storageOk] = await Promise.all([
    check('/api/health/db'),
    check('/api/health/mq'),
    check('/api/health/storage'),
  ]);
  const ok = dbOk && mqOk && storageOk;
  const res = NextResponse.json(
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
  const dur = durationMs(start);
  logger.info('GET /api/status end', { requestId, status: ok ? 200 : 503, durationMs: dur });
  recordTelemetry({
    eventType: 'api.status',
    requestId,
    properties: { ok, dbOk, mqOk, storageOk, durationMs: dur },
  });
  return res;
}
