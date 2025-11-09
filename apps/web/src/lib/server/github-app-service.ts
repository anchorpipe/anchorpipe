/**
 * GitHub App Service
 *
 * Handles GitHub App installation lifecycle, webhook events, and installation management.
 *
 * Story: ST-301
 */

import { prisma } from '@anchorpipe/database';
import { writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from './audit-service';
import { logger } from './logger';
import { RepoVisibility, Prisma } from '@prisma/client';

/**
 * GitHub App Installation data from webhook
 */
export interface GitHubAppInstallationData {
  id: number; // GitHub installation ID
  account: {
    id: number;
    login: string;
    type: 'User' | 'Organization';
  };
  target_type: 'User' | 'Organization';
  target_id?: number;
  repository_selection: 'all' | 'selected';
  repositories?: Array<{ id: number; name: string; full_name: string }>;
  permissions: Record<string, string>;
  events: string[];
  suspended_at?: string | null;
  suspended_by?: {
    id: number;
    login: string;
  } | null;
  suspended_reason?: string | null;
}

/**
 * Create or update GitHub App installation
 */
export async function upsertGitHubAppInstallation(
  data: GitHubAppInstallationData,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ id: string; installationId: bigint }> {
  const installationId = BigInt(data.id);
  const accountId = BigInt(data.account.id);
  const targetId = data.target_id ? BigInt(data.target_id) : null;

  // Convert repository IDs to BigInt array
  const repositoryIds =
    data.repositories?.map((repo) => BigInt(repo.id)) ?? [];

  // Convert suspended_at to DateTime if present
  const suspendedAt = data.suspended_at
    ? new Date(data.suspended_at)
    : null;

  // Check if installation already exists
  const existing = await prisma.gitHubAppInstallation.findUnique({
    where: { installationId },
  });

  if (existing) {
    // Update existing installation
    const updated = await prisma.gitHubAppInstallation.update({
      where: { installationId },
      data: {
        accountId,
        accountType: data.account.type,
        accountLogin: data.account.login,
        targetType: data.target_type,
        targetId,
        repositoryIds,
        permissions: data.permissions as unknown as Prisma.InputJsonValue,
        events: data.events,
        suspendedAt,
        suspendedBy: data.suspended_by?.id.toString() ?? null,
        suspendedReason: data.suspended_reason ?? null,
        updatedAt: new Date(),
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.system,
      description: `GitHub App installation updated: ${data.account.login}`,
      metadata: {
        installationId: data.id,
        accountLogin: data.account.login,
        repositoryCount: repositoryIds.length,
      },
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    logger.info('GitHub App installation updated', {
      installationId: data.id,
      accountLogin: data.account.login,
    });

    return { id: updated.id, installationId };
  } else {
    // Create new installation
    const created = await prisma.gitHubAppInstallation.create({
      data: {
        installationId,
        accountId,
        accountType: data.account.type,
        accountLogin: data.account.login,
        targetType: data.target_type,
        targetId,
        repositoryIds,
        permissions: data.permissions as unknown as Prisma.InputJsonValue,
        events: data.events,
        suspendedAt,
        suspendedBy: data.suspended_by?.id.toString() ?? null,
        suspendedReason: data.suspended_reason ?? null,
      },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.system,
      description: `GitHub App installation created: ${data.account.login}`,
      metadata: {
        installationId: data.id,
        accountLogin: data.account.login,
        repositoryCount: repositoryIds.length,
      },
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    logger.info('GitHub App installation created', {
      installationId: data.id,
      accountLogin: data.account.login,
    });

    return { id: created.id, installationId };
  }
}

/**
 * Delete GitHub App installation
 */
export async function deleteGitHubAppInstallation(
  installationId: bigint,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<void> {
  const existing = await prisma.gitHubAppInstallation.findUnique({
    where: { installationId },
  });

  if (!existing) {
    logger.warn('GitHub App installation not found for deletion', {
      installationId: installationId.toString(),
    });
    return;
  }

  await prisma.gitHubAppInstallation.delete({
    where: { installationId },
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.system,
    description: `GitHub App installation deleted: ${existing.accountLogin}`,
    metadata: {
      installationId: installationId.toString(),
      accountLogin: existing.accountLogin,
    },
    ipAddress: metadata?.ipAddress ?? null,
    userAgent: metadata?.userAgent ?? null,
  });

  logger.info('GitHub App installation deleted', {
    installationId: installationId.toString(),
    accountLogin: existing.accountLogin,
  });
}

/**
 * Get GitHub App installation by installation ID
 */
export async function getGitHubAppInstallationById(
  installationId: bigint
): Promise<{
  id: string;
  installationId: bigint;
  accountId: bigint;
  accountType: string;
  accountLogin: string;
  targetType: string;
  targetId: bigint | null;
  repositoryIds: bigint[];
  permissions: Record<string, unknown>;
  events: string[];
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspendedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const installation = await prisma.gitHubAppInstallation.findUnique({
    where: { installationId },
  });

  if (!installation) {
    return null;
  }

  return {
    id: installation.id,
    installationId: installation.installationId,
    accountId: installation.accountId,
    accountType: installation.accountType,
    accountLogin: installation.accountLogin,
    targetType: installation.targetType,
    targetId: installation.targetId,
    repositoryIds: installation.repositoryIds,
    permissions: installation.permissions as Record<string, unknown>,
    events: installation.events,
    suspendedAt: installation.suspendedAt,
    suspendedBy: installation.suspendedBy,
    suspendedReason: installation.suspendedReason,
    createdAt: installation.createdAt,
    updatedAt: installation.updatedAt,
  };
}

/**
 * List all GitHub App installations
 */
export async function listGitHubAppInstallations(): Promise<
  Array<{
    id: string;
    installationId: bigint;
    accountLogin: string;
    accountType: string;
    repositoryCount: number;
    suspendedAt: Date | null;
    createdAt: Date;
  }>
> {
  const installations = await prisma.gitHubAppInstallation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      installationId: true,
      accountLogin: true,
      accountType: true,
      repositoryIds: true,
      suspendedAt: true,
      createdAt: true,
    },
  });

  return installations.map((inst) => ({
    id: inst.id,
    installationId: inst.installationId,
    accountLogin: inst.accountLogin,
    accountType: inst.accountType,
    repositoryCount: inst.repositoryIds.length,
    suspendedAt: inst.suspendedAt,
    createdAt: inst.createdAt,
  }));
}

/**
 * Get installations by account login
 */
export async function getGitHubAppInstallationsByAccount(
  accountLogin: string
): Promise<
  Array<{
    id: string;
    installationId: bigint;
    accountLogin: string;
    repositoryCount: number;
    suspendedAt: Date | null;
    createdAt: Date;
  }>
> {
  const installations = await prisma.gitHubAppInstallation.findMany({
    where: { accountLogin },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      installationId: true,
      accountLogin: true,
      repositoryIds: true,
      suspendedAt: true,
      createdAt: true,
    },
  });

  return installations.map((inst) => ({
    id: inst.id,
    installationId: inst.installationId,
    accountLogin: inst.accountLogin,
    repositoryCount: inst.repositoryIds.length,
    suspendedAt: inst.suspendedAt,
    createdAt: inst.createdAt,
  }));
}

/**
 * Sync repositories from GitHub App installation
 * Creates or updates Repo records when repositories are added to an installation
 */
export async function syncRepositoriesFromInstallation(
  repositories: Array<{
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    default_branch?: string;
    private: boolean;
  }>,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const repo of repositories) {
    const ghId = BigInt(repo.id);
    const [owner, name] = repo.full_name.split('/');

    const existing = await prisma.repo.findUnique({
      where: { ghId },
    });

    const repoData = {
      ghId,
      name,
      owner,
      defaultBranch: repo.default_branch || 'main',
      visibility: (repo.private ? 'private' : 'public') as RepoVisibility,
    };

    if (existing) {
      await prisma.repo.update({
        where: { ghId },
        data: repoData,
      });
      updated++;
    } else {
      await prisma.repo.create({
        data: repoData,
      });
      created++;
    }
  }

  if (created > 0 || updated > 0) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.repo,
      description: `Synced ${created} new and ${updated} updated repositories from GitHub App installation`,
      metadata: {
        repositoriesCreated: created,
        repositoriesUpdated: updated,
        totalRepositories: repositories.length,
      },
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    logger.info('Repositories synced from GitHub App installation', {
      created,
      updated,
      total: repositories.length,
    });
  }

  return { created, updated };
}

/**
 * Validate GitHub App installation permissions
 * Checks if installation has required permissions
 */
export async function validateInstallationPermissions(
  installationId: bigint
): Promise<{ valid: boolean; missing: string[]; warnings: string[] }> {
  const installation = await getGitHubAppInstallationById(installationId);

  if (!installation) {
    return {
      valid: false,
      missing: ['installation_not_found'],
      warnings: [],
    };
  }

  const required = {
    metadata: 'read',
    contents: 'read',
    pull_requests: 'write',
    checks: 'write',
  };

  const missing: string[] = [];
  const warnings: string[] = [];

  const permissions = installation.permissions as Record<string, string>;

  for (const [permission, requiredLevel] of Object.entries(required)) {
    const actualLevel = permissions[permission];

    if (!actualLevel) {
      missing.push(`${permission}:${requiredLevel}`);
    } else if (actualLevel !== requiredLevel && actualLevel !== 'write') {
      // If we need 'write' but only have 'read', that's a problem
      if (requiredLevel === 'write' && actualLevel === 'read') {
        missing.push(`${permission}:${requiredLevel}`);
      } else {
        warnings.push(
          `${permission} has ${actualLevel} but ${requiredLevel} is recommended`
        );
      }
    }
  }

  const valid = missing.length === 0;

  if (!valid || warnings.length > 0) {
    logger.warn('GitHub App installation has insufficient permissions', {
      installationId: installationId.toString(),
      missing,
      warnings,
    });
  }

  return { valid, missing, warnings };
}

