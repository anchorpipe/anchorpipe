import { NextResponse } from 'next/server';
import { connectRabbit } from '@anchorpipe/mq';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    return NextResponse.json({ ok: false, reason: 'RABBITMQ_URL not set' }, { status: 503 });
  }
  try {
    const { channel } = await connectRabbit(url);
    await channel.close();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'connect_failed' }, { status: 503 });
  }
}


