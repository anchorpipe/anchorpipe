import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { listAuditLogs } from '@/lib/server/audit-service';
import { userHasAdminRole } from '@/lib/server/rbac-service';

export const dynamic = 'force-dynamic';

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

    const searchParams = request.nextUrl.searchParams;
    const subject = searchParams.get('subject') ?? undefined;
    const actorId = searchParams.get('actorId') ?? undefined;
    const cursor = searchParams.get('cursor') ?? undefined;
    const limitParam = searchParams.get('limit');
    let limit = 50;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      const normalizedLimit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;
      limit = Math.min(Math.max(normalizedLimit, 1), 200);
    }

    const logs = await listAuditLogs({
      limit,
      subject: subject as any,
      actorId: actorId ?? undefined,
      cursor: cursor ?? undefined,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('Failed to list audit logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
