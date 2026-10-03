import { NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { readSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await readSession();
  if (!session?.sub) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: String(session.sub) } });
  return NextResponse.json({
    authenticated: true,
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
  });
}
