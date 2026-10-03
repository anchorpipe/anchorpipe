import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { extractRequestContext } from '@/lib/server/audit-service';
import { readSession } from '@/lib/server/auth';
import { userHasAdminRole } from '@/lib/server/rbac-service';

export async function GET(request: NextRequest) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await userHasAdminRole(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const _context = extractRequestContext(request);

    const deadLetters = await prisma.deadLetter.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ deadLetters });
  } catch (error) {
    console.error('[DLQ API] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
