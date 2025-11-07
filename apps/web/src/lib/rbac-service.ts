import { prisma } from '@anchorpipe/database';
import { createAbilityForRole, type AppAbility, RepoRole } from './rbac';
import { AUDIT_ACTIONS, AUDIT_SUBJECTS, RequestContext, writeAuditLog } from './audit-service';

// Use Prisma client directly - models should be available after regeneration
// Type assertion needed until TypeScript server picks up new Prisma types
// After restarting TypeScript server, these should be available directly
const prismaWithRBAC = prisma as any;

/**
 * Get a user's role for a specific repository
 */
export async function getUserRepoRole(userId: string, repoId: string): Promise<RepoRole | null> {
  if (!userId || !repoId) {
    return null;
  }

  try {
    const userRole = await prismaWithRBAC.userRepoRole.findUnique({
      where: {
        userId_repoId: {
          userId,
          repoId,
        },
      },
      select: {
        role: true,
      },
    });

    return userRole?.role ?? null;
  } catch (error) {
    console.error('Error getting user repo role:', error);
    return null;
  }
}

/**
 * Get user's ability for a repository
 */
export async function getUserAbility(userId: string, repoId: string): Promise<AppAbility> {
  const role = await getUserRepoRole(userId, repoId);
  return createAbilityForRole(role);
}

export async function userHasAdminRole(userId: string): Promise<boolean> {
  const adminRole = await prismaWithRBAC.userRepoRole.findFirst({
    where: {
      userId,
      role: RepoRole.ADMIN,
    },
    select: {
      id: true,
    },
  });

  return Boolean(adminRole);
}

/**
 * Assign or update a user's role in a repository
 */
export async function assignRole(
  actorId: string,
  userId: string,
  repoId: string,
  role: RepoRole,
  context?: RequestContext
): Promise<void> {
  // Check if actor has admin permission
  const actorAbility = await getUserAbility(actorId, repoId);
  if (!actorAbility.can('admin', 'role')) {
    throw new Error('Permission denied: only admins can assign roles');
  }

  // Get old role for audit log
  const existingRole = await getUserRepoRole(userId, repoId);

  // Upsert the role
  await prismaWithRBAC.userRepoRole.upsert({
    where: {
      userId_repoId: {
        userId,
        repoId,
      },
    },
    create: {
      userId,
      repoId,
      role,
      assignedBy: actorId,
    },
    update: {
      role,
      assignedBy: actorId,
    },
  });

  // Log the change
  await prismaWithRBAC.roleAuditLog.create({
    data: {
      actorId,
      targetUserId: userId,
      repoId,
      action: existingRole ? 'updated' : 'assigned',
      oldRole: existingRole ?? null,
      newRole: role,
    },
  });

  await writeAuditLog({
    actorId,
    action: AUDIT_ACTIONS.roleAssigned,
    subject: AUDIT_SUBJECTS.repo,
    subjectId: repoId,
    description: `Assigned role ${role} to user ${userId}.`,
    metadata: {
      targetUserId: userId,
      previousRole: existingRole,
      newRole: role,
    },
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
  });
}

/**
 * Remove a user's role from a repository
 */
export async function removeRole(
  actorId: string,
  userId: string,
  repoId: string,
  context?: RequestContext
): Promise<void> {
  // Check if actor has admin permission
  const actorAbility = await getUserAbility(actorId, repoId);
  if (!actorAbility.can('admin', 'role')) {
    throw new Error('Permission denied: only admins can remove roles');
  }

  // Get old role for audit log
  const existingRole = await getUserRepoRole(userId, repoId);
  if (!existingRole) {
    return; // No role to remove
  }

  // Delete the role
  await prismaWithRBAC.userRepoRole.delete({
    where: {
      userId_repoId: {
        userId,
        repoId,
      },
    },
  });

  // Log the change
  await prismaWithRBAC.roleAuditLog.create({
    data: {
      actorId,
      targetUserId: userId,
      repoId,
      action: 'removed',
      oldRole: existingRole,
      newRole: null,
    },
  });

  await writeAuditLog({
    actorId,
    action: AUDIT_ACTIONS.roleRemoved,
    subject: AUDIT_SUBJECTS.repo,
    subjectId: repoId,
    description: `Removed role ${existingRole} from user ${userId}.`,
    metadata: {
      targetUserId: userId,
      removedRole: existingRole,
    },
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
  });
}

/**
 * Get all users with roles for a repository
 */
export async function getRepoUsers(repoId: string) {
  return await prismaWithRBAC.userRepoRole.findMany({
    where: {
      repoId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          githubLogin: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get audit logs for role changes in a repository
 */
export async function getRoleAuditLogs(repoId: string, limit = 50) {
  return await prismaWithRBAC.roleAuditLog.findMany({
    where: {
      repoId,
    },
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          name: true,
          githubLogin: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true,
          githubLogin: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}
