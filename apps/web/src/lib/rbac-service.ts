import { prisma } from '@anchorpipe/database';
import { createAbilityForRole, type AppAbility, RepoRole } from './rbac';

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

/**
 * Assign or update a user's role in a repository
 */
export async function assignRole(
  actorId: string,
  userId: string,
  repoId: string,
  role: RepoRole
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
}

/**
 * Remove a user's role from a repository
 */
export async function removeRole(actorId: string, userId: string, repoId: string): Promise<void> {
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
