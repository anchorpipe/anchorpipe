import { NextResponse } from 'next/server';
import { PrismaClient } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email } });
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } })
      : await prisma.user.create({ data: { email } });

    const token = await createSessionJwt({ sub: user.id, email: user.email || undefined });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
