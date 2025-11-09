/**
 * GitHub App Service
 *
 * Handles GitHub App installation lifecycle, webhook events, and installation management.
 *
 * Story: ST-301
 */

// cSpell:ignore anchorpipe
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

/**
 * Installation health check result
 */
export interface InstallationHealthCheck {
  healthy: boolean;
  installationId: bigint;
  accountLogin: string;
  checks: {
    exists: { status: 'pass' | 'fail'; message?: string };
    notSuspended: { status: 'pass' | 'fail' | 'warning'; message?: string };
    tokenGeneration: { status: 'pass' | 'fail'; message?: string };
    permissions: {
      status: 'pass' | 'fail' | 'warning';
      message?: string;
      details?: { valid: boolean; missing: string[]; warnings: string[] };
    };
    repositoryAccess?: {
      status: 'pass' | 'fail' | 'warning';
      message?: string;
      accessibleRepos?: number;
    };
  };
  summary: string;
}

/**
 * Check if installation can generate tokens (verify GitHub API access)
 */
async function checkTokenGeneration(installationId: bigint): Promise<{
  status: 'pass' | 'fail';
  message?: string;
}> {
  try {
    const { getInstallationToken } = await import('./github-app-tokens');
    await getInstallationToken(installationId);
    return { status: 'pass' };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Failed to generate token',
    };
  }
}

/**
 * Check if installation can access repositories
 */
async function checkRepositoryAccess(
  installationId: bigint,
  repositoryIds: bigint[]
): Promise<{
  status: 'pass' | 'fail' | 'warning';
  message?: string;
  accessibleRepos?: number;
}> {
  if (repositoryIds.length === 0) {
    return {
      status: 'warning',
      message: 'No repositories configured for this installation',
    };
  }

  try {
    const { getInstallationToken } = await import('./github-app-tokens');
    const token = await getInstallationToken(installationId);

    // Try to access the first repository to verify access
    // We'll check if we can get repository info from GitHub API
    // For now, we'll just verify token works - full repo access check would require repo full_name
    // This is a simplified check - in production, you might want to verify specific repos

    // Check if we can access repositories using the installation token
    // Use the installation repositories endpoint
    const response = await fetch('https://api.github.com/installation/repositories', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return {
        status: 'fail',
        message: `Cannot access repositories: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      repositories: Array<{ id: number }>;
    };

    const accessibleRepos = data.repositories?.length ?? 0;

    if (accessibleRepos === 0) {
      return {
        status: 'warning',
        message: 'No accessible repositories found',
        accessibleRepos: 0,
      };
    }

    return {
      status: 'pass',
      accessibleRepos,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Failed to check repository access',
    };
  }
}

/**
 * Create health check result for missing installation
 */
function createNotFoundHealthCheck(installationId: bigint): InstallationHealthCheck {
  return {
    healthy: false,
    installationId,
    accountLogin: 'unknown',
    checks: {
      exists: { status: 'fail', message: 'Installation not found in database' },
      notSuspended: { status: 'fail', message: 'Cannot check - installation not found' },
      tokenGeneration: { status: 'fail', message: 'Cannot check - installation not found' },
      permissions: { status: 'fail', message: 'Cannot check - installation not found' },
    },
    summary: 'Installation not found in database',
  };
}

/**
 * Check if installation is suspended
 */
function checkSuspendedStatus(suspendedAt: Date | null): {
  status: 'pass' | 'warning';
  message?: string;
} {
  return suspendedAt
    ? {
        status: 'warning',
        message: `Installation suspended at ${suspendedAt.toISOString()}`,
      }
    : { status: 'pass' };
}

/**
 * Determine permission check status
 */
function determinePermissionStatus(validation: {
  valid: boolean;
  missing: string[];
  warnings: string[];
}): { status: 'pass' | 'fail' | 'warning'; message?: string } {
  return {
    status: validation.valid ? 'pass' : validation.missing.length > 0 ? 'fail' : 'warning',
    message: validation.valid ? undefined : `Missing permissions: ${validation.missing.join(', ')}`,
  };
}

/**
 * Determine overall health status
 */
function determineHealthStatus(checks: InstallationHealthCheck['checks']): {
  healthy: boolean;
  summary: string;
} {
  const hasFailures = Object.values(checks).some((check) => check.status === 'fail');
  const hasWarnings = Object.values(checks).some((check) => check.status === 'warning');

  const healthy = !hasFailures;
  const summary = hasFailures
    ? 'Installation has critical issues'
    : hasWarnings
      ? 'Installation has warnings but is functional'
      : 'Installation is healthy';

  return { healthy, summary };
}

/**
 * Perform health check on GitHub App installation
 */
export async function checkInstallationHealth(
  installationId: bigint
): Promise<InstallationHealthCheck> {
  const installation = await getGitHubAppInstallationById(installationId);

  // Check if installation exists
  if (!installation) {
    return createNotFoundHealthCheck(installationId);
  }

  // Run health checks
  const checks: InstallationHealthCheck['checks'] = {
    exists: { status: 'pass' },
    notSuspended: checkSuspendedStatus(installation.suspendedAt),
    tokenGeneration: await checkTokenGeneration(installationId),
    permissions: { status: 'pass' },
  };

  // Check permissions
  const permissionValidation = await validateInstallationPermissions(installationId);
  checks.permissions = {
    ...determinePermissionStatus(permissionValidation),
    details: permissionValidation,
  };

  // Check repository access if there are repositories
  if (installation.repositoryIds.length > 0) {
    checks.repositoryAccess = await checkRepositoryAccess(
      installationId,
      installation.repositoryIds
    );
  }

  // Determine overall health
  const { healthy, summary } = determineHealthStatus(checks);

  return {
    healthy,
    installationId,
    accountLogin: installation.accountLogin,
    checks,
    summary,
  };
}

/**
 * Update repository selection for GitHub App installation
 * Adds or removes repositories from the installation
 */
export async function updateInstallationRepositorySelection(
  installationId: bigint,
  repositoryIds: number[],
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ success: boolean; error?: string; updatedRepositories?: number }> {
  try {
    // Get installation to verify it exists
    const installation = await getGitHubAppInstallationById(installationId);
    if (!installation) {
      return {
        success: false,
        error: 'Installation not found',
      };
    }

    // Get installation token
    const { getInstallationToken } = await import('./github-app-tokens');
    const token = await getInstallationToken(installationId);

    // Update repository selection via GitHub API
    // GitHub API expects selected_repository_ids array
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/repositories`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_repository_ids: repositoryIds,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to update repository selection via GitHub API', {
        installationId: installationId.toString(),
        status: response.status,
        error,
      });
      return {
        success: false,
        error: `GitHub API returned ${response.status}: ${error}`,
      };
    }

    // Update database record with new repository IDs
    const repositoryIdsBigInt = repositoryIds.map((id) => BigInt(id));
    await (prisma as any).gitHubAppInstallation.update({
      where: { installationId },
      data: {
        repositoryIds: repositoryIdsBigInt,
        updatedAt: new Date(),
      },
    });

    // Sync repositories to our database
    // We need to fetch repository details from GitHub API
    const reposResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}/repositories`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (reposResponse.ok) {
      const reposData = (await reposResponse.json()) as {
        repositories: Array<{
          id: number;
          name: string;
          full_name: string;
          owner: { login: string };
          default_branch?: string;
          private: boolean;
        }>;
      };

      if (reposData.repositories && reposData.repositories.length > 0) {
        await syncRepositoriesFromInstallation(
          reposData.repositories.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            owner: repo.owner,
            default_branch: repo.default_branch,
            private: repo.private,
          })),
          metadata
        );
      }
    }

    // Log audit event
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.system,
      description: `Updated repository selection for GitHub App installation: ${installation.accountLogin}`,
      metadata: {
        installationId: installationId.toString(),
        accountLogin: installation.accountLogin,
        repositoryCount: repositoryIds.length,
        repositoryIds: repositoryIds.map(String),
      },
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    logger.info('GitHub App installation repository selection updated', {
      installationId: installationId.toString(),
      accountLogin: installation.accountLogin,
      repositoryCount: repositoryIds.length,
    });

    return {
      success: true,
      updatedRepositories: repositoryIds.length,
    };
  } catch (error) {
    logger.error('Failed to update repository selection', {
      installationId: installationId.toString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
