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
 * Prepare installation data for database
 */
function prepareInstallationData(data: GitHubAppInstallationData) {
  const installationId = BigInt(data.id);
  const accountId = BigInt(data.account.id);
  const targetId = data.target_id ? BigInt(data.target_id) : null;
  const repositoryIds = data.repositories?.map((repo) => BigInt(repo.id)) ?? [];
  const suspendedAt = data.suspended_at ? new Date(data.suspended_at) : null;

  return {
    installationId,
    accountId,
    targetId,
    repositoryIds,
    suspendedAt,
    data: {
      accountId,
      accountType: data.account.type,
      accountLogin: data.account.login,
      targetType: data.target_type,
      targetId,
      repositoryIds,
      permissions: data.permissions as any,
      events: data.events,
      suspendedAt,
      suspendedBy: data.suspended_by?.id.toString() ?? null,
      suspendedReason: data.suspended_reason ?? null,
    },
  };
}

/**
 * Log installation audit event
 */
async function logInstallationAudit(
  action: 'created' | 'updated',
  data: GitHubAppInstallationData,
  repositoryCount: number,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
) {
  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.system,
    description: `GitHub App installation ${action}: ${data.account.login}`,
    metadata: {
      installationId: data.id,
      accountLogin: data.account.login,
      repositoryCount,
    },
    ipAddress: metadata?.ipAddress ?? null,
    userAgent: metadata?.userAgent ?? null,
  });

  logger.info(`GitHub App installation ${action}`, {
    installationId: data.id,
    accountLogin: data.account.login,
  });
}

/**
 * Create or update GitHub App installation
 */
export async function upsertGitHubAppInstallation(
  data: GitHubAppInstallationData,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ id: string; installationId: bigint }> {
  const { installationId, data: installationData, repositoryIds } = prepareInstallationData(data);

  const existing = await (prisma as any).gitHubAppInstallation.findUnique({
    where: { installationId },
  });

  if (existing) {
    const updated = await (prisma as any).gitHubAppInstallation.update({
      where: { installationId },
      data: {
        ...installationData,
        updatedAt: new Date(),
      },
    });

    await logInstallationAudit('updated', data, repositoryIds.length, metadata);
    return { id: updated.id, installationId };
  }

  const created = await (prisma as any).gitHubAppInstallation.create({
    data: {
      ...installationData,
      installationId,
    },
  });

  await logInstallationAudit('created', data, repositoryIds.length, metadata);
  return { id: created.id, installationId };
}

/**
 * Delete GitHub App installation
 */
export async function deleteGitHubAppInstallation(
  installationId: bigint,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<void> {
  const existing = await (prisma as any).gitHubAppInstallation.findUnique({
    where: { installationId },
  });

  if (!existing) {
    logger.warn('GitHub App installation not found for deletion', {
      installationId: installationId.toString(),
    });
    return;
  }

  await (prisma as any).gitHubAppInstallation.delete({
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
export async function getGitHubAppInstallationById(installationId: bigint): Promise<{
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
  const installation = await (prisma as any).gitHubAppInstallation.findUnique({
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
 * Type for installation list item
 */
type InstallationListItem = {
  id: string;
  installationId: bigint;
  accountLogin: string;
  repositoryCount: number;
  suspendedAt: Date | null;
  createdAt: Date;
};

/**
 * Type for installation with account type
 */
type InstallationWithAccountType = InstallationListItem & {
  accountType: string;
};

/**
 * Map installation database record to list item
 */
function mapInstallationToListItem(inst: {
  id: string;
  installationId: bigint;
  accountLogin: string;
  repositoryIds: bigint[];
  suspendedAt: Date | null;
  createdAt: Date;
}): InstallationListItem {
  return {
    id: inst.id,
    installationId: inst.installationId,
    accountLogin: inst.accountLogin,
    repositoryCount: inst.repositoryIds.length,
    suspendedAt: inst.suspendedAt,
    createdAt: inst.createdAt,
  };
}

/**
 * Map installation database record to list item with account type
 */
function mapInstallationWithAccountType(inst: {
  id: string;
  installationId: bigint;
  accountLogin: string;
  accountType: string;
  repositoryIds: bigint[];
  suspendedAt: Date | null;
  createdAt: Date;
}): InstallationWithAccountType {
  return {
    ...mapInstallationToListItem(inst),
    accountType: inst.accountType,
  };
}

/**
 * Common select fields for installation list queries
 */
const INSTALLATION_LIST_SELECT = {
  id: true,
  installationId: true,
  accountLogin: true,
  repositoryIds: true,
  suspendedAt: true,
  createdAt: true,
} as const;

/**
 * Select fields for installation list with account type
 */
const INSTALLATION_LIST_WITH_ACCOUNT_TYPE_SELECT = {
  ...INSTALLATION_LIST_SELECT,
  accountType: true,
} as const;

/**
 * List all GitHub App installations
 */
export async function listGitHubAppInstallations(): Promise<InstallationWithAccountType[]> {
  const installations = await (prisma as any).gitHubAppInstallation.findMany({
    orderBy: { createdAt: 'desc' },
    select: INSTALLATION_LIST_WITH_ACCOUNT_TYPE_SELECT,
  });

  return installations.map(mapInstallationWithAccountType);
}

/**
 * Get installations by account login
 */
export async function getGitHubAppInstallationsByAccount(
  accountLogin: string
): Promise<InstallationListItem[]> {
  const installations = await (prisma as any).gitHubAppInstallation.findMany({
    where: { accountLogin },
    orderBy: { createdAt: 'desc' },
    select: INSTALLATION_LIST_SELECT,
  });

  return installations.map(mapInstallationToListItem);
}

/**
 * Sync a single repository from GitHub App installation
 */
async function syncSingleRepository(repo: {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch?: string;
  private: boolean;
}): Promise<'created' | 'updated'> {
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
    visibility: (repo.private ? 'private' : 'public') as 'public' | 'private',
  };

  if (existing) {
    await prisma.repo.update({
      where: { ghId },
      data: repoData,
    });
    return 'updated';
  }

  await prisma.repo.create({
    data: repoData,
  });
  return 'created';
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
    const result = await syncSingleRepository(repo);
    if (result === 'created') {
      created++;
    } else {
      updated++;
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
 * Check if permission level is sufficient (write satisfies read requirement)
 */
function isPermissionSufficient(actual: string, required: string): boolean {
  if (actual === required) {
    return true;
  }
  // write permission satisfies read requirement
  return required === 'read' && actual === 'write';
}

/**
 * Check if a permission level meets the requirement
 */
function checkPermissionLevel(
  actual: string | undefined,
  required: string
): { valid: boolean; missing: boolean; warning: boolean } {
  if (!actual) {
    return { valid: false, missing: true, warning: false };
  }

  if (isPermissionSufficient(actual, required)) {
    return { valid: true, missing: false, warning: false };
  }

  if (required === 'write' && actual === 'read') {
    return { valid: false, missing: true, warning: false };
  }

  return { valid: true, missing: false, warning: true };
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
    const check = checkPermissionLevel(actualLevel, requiredLevel);

    if (check.missing) {
      missing.push(`${permission}:${requiredLevel}`);
    } else if (check.warning) {
      warnings.push(`${permission} has ${actualLevel} but ${requiredLevel} is recommended`);
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
