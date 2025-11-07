import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthz } from '@/lib/authz';
import { assignRole, removeRole, getRepoUsers } from '@/lib/rbac-service';
import { RepoRole } from '@/lib/rbac';
import { validateRequest } from '@/lib/validation';

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(RepoRole),
});

const removeRoleSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /api/repos/[repoId]/roles
 * Get all users with roles for a repository
 * Requires: read role permission
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
    const _context = await requireAuthz(request, 'read', 'role', repoId);

    const users = await getRepoUsers(repoId);

    return NextResponse.json({ users });
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

/**
 * POST /api/repos/[repoId]/roles
 * Assign or update a user's role
 * Requires: admin role permission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
    const context = await requireAuthz(request, 'admin', 'role', repoId);

    const validation = await validateRequest(request, assignRoleSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { userId, role } = validation.data;
    await assignRole(context.userId, userId, repoId, role);

    return NextResponse.json({
      message: 'Role assigned successfully',
      userId,
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized')
      ? 401
      : message.includes('Forbidden')
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/repos/[repoId]/roles
 * Remove a user's role
 * Requires: admin role permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
    const context = await requireAuthz(request, 'admin', 'role', repoId);

    const validation = await validateRequest(request, removeRoleSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { userId } = validation.data;
    await removeRole(context.userId, userId, repoId);

    return NextResponse.json({
      message: 'Role removed successfully',
      userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized')
      ? 401
      : message.includes('Forbidden')
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
