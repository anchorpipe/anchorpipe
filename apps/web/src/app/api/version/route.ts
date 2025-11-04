import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger, nowMs, durationMs } from '@/lib/logger';
import { httpRequestDurationMs } from '@/lib/metrics';
import { recordTelemetry } from '@/lib/telemetry';
// Import app package.json (apps/web/package.json)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const h = headers();
  const requestId = h.get('x-request-id') || undefined;
  const start = nowMs();
  logger.info('GET /api/version start', { requestId });
  const name = process.env.NEXT_PUBLIC_APP_NAME || 'anchorpipe';
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  const res = NextResponse.json({ name, version });
  const dur = durationMs(start);
  logger.info('GET /api/version end', { requestId, status: 200, durationMs: dur });
  httpRequestDurationMs
    .labels({ route: '/api/version', method: 'GET', status: '200' })
    .observe(dur);
  recordTelemetry({ eventType: 'api.version', requestId, properties: { durationMs: dur } });
  return res;
}
