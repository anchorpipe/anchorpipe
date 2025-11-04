import { NextResponse } from 'next/server';
// Import app package.json (apps/web/package.json)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const name = process.env.NEXT_PUBLIC_APP_NAME || 'anchorpipe';
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  return NextResponse.json({ name, version });
}


