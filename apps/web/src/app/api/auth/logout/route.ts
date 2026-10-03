import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
