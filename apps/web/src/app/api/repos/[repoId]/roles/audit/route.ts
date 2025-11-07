import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz';
import { getRoleAuditLogs } from '@/lib/rbac-service';

/**
 * GET /api/repos/[repoId]/roles/audit
 * Get audit logs for role changes in a repository
 * Requires: read role permission
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
    const _context = await requireAuthz(request, 'read', 'role', repoId);

    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const logs = await getRoleAuditLogs(repoId, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized')
      ? 401
      : message.includes('Forbidden')
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
