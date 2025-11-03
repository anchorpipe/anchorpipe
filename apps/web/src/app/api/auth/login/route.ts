import { NextResponse } from 'next/server';
import { PrismaClient } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { lastLoginAt: new Date() },
      create: { email },
    });

    const token = await createSessionJwt({ sub: user.id, email: user.email || undefined });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


