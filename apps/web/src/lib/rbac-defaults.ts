import { prisma } from '@anchorpipe/database';
import { RepoRole } from './rbac';

// Type assertion for Prisma client with RBAC models
const prismaWithRBAC = prisma as any;

/**
 * Assign default role to a user for a repository
 * Default role: 'member' (can be changed per repository or user)
 */
export async function assignDefaultRole(
  userId: string,
  repoId: string,
  defaultRole: RepoRole = RepoRole.MEMBER
): Promise<void> {
  // Check if role already exists
  const existing = await prismaWithRBAC.userRepoRole.findUnique({
    where: {
      userId_repoId: {
        userId,
        repoId,
      },
    },
  });

  if (existing) {
    return; // Role already assigned
  }

  // Assign default role (self-assigned for first assignment)
  await prismaWithRBAC.userRepoRole.create({
    data: {
      userId,
      repoId,
      role: defaultRole,
      assignedBy: userId, // Self-assigned for default roles
    },
  });

  // Log the default assignment
  await prismaWithRBAC.roleAuditLog.create({
    data: {
      actorId: userId,
      targetUserId: userId,
      repoId,
      action: 'assigned',
      oldRole: null,
      newRole: defaultRole,
      metadata: {
        source: 'default',
        reason: 'Default role assignment',
      },
    },
  });
}

/**
 * Assign default role when a user is created
 * This can be called from user registration or OAuth callback
 */
export async function assignDefaultRoleOnUserCreate(
  userId: string,
  repoId?: string
): Promise<void> {
  if (!repoId) {
    // If no repo specified, assign default role to all public repos
    // For now, we'll skip this - roles should be assigned when user joins a repo
    return;
  }

  await assignDefaultRole(userId, repoId);
}

/**
 * Assign default role when a repository is created
 * Repository creator gets 'admin' role by default
 */
export async function assignDefaultRoleOnRepoCreate(
  repoId: string,
  creatorUserId: string
): Promise<void> {
  // Repository creator gets admin role
  await prismaWithRBAC.userRepoRole.create({
    data: {
      userId: creatorUserId,
      repoId,
      role: RepoRole.ADMIN,
      assignedBy: creatorUserId,
    },
  });

  // Log the assignment
  await prismaWithRBAC.roleAuditLog.create({
    data: {
      actorId: creatorUserId,
      targetUserId: creatorUserId,
      repoId,
      action: 'assigned',
      oldRole: null,
      newRole: RepoRole.ADMIN,
      metadata: {
        source: 'repo_creation',
        reason: 'Repository creator gets admin role',
      },
    },
  });
}

