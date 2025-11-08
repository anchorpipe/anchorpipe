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
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50;

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
