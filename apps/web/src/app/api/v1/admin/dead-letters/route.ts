import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { extractRequestContext } from '@/lib/server/audit-service';
import { getUserAbility } from '@/lib/server/rbac-service';

export async function GET(request: NextRequest) {
  try {
    const _context = extractRequestContext(request);
    const ability = await getUserAbility('system-admin', 'SYSTEM');

    if (!ability.can('read', 'audit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
