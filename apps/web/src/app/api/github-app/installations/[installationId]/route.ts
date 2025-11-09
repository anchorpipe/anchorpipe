/**
 * GitHub App Installation API
 *
 * Endpoints for managing a specific GitHub App installation
 *
 * Story: ST-301
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { extractRequestContext } from '@/lib/server/audit-service';
import {
  getGitHubAppInstallationById,
  validateInstallationPermissions,
  deleteGitHubAppInstallation,
  checkInstallationHealth,
} from '@/lib/server/github-app-service';
import { clearInstallationTokenCache } from '@/lib/server/github-app-tokens';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

/**
 * GET /api/github-app/installations/[installationId]
 * Get a specific GitHub App installation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> }
) {
  try {
    // Require authentication
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { installationId } = await params;
    const installationIdBigInt = BigInt(installationId);

    const installation = await getGitHubAppInstallationById(installationIdBigInt);

    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Validate permissions
    const permissionValidation = await validateInstallationPermissions(installationIdBigInt);

    return NextResponse.json({
      installation,
      permissions: {
        valid: permissionValidation.valid,
        missing: permissionValidation.missing,
        warnings: permissionValidation.warnings,
      },
    });
  } catch (error) {
    logger.error('Error getting GitHub App installation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/github-app/installations/[installationId]
 * Uninstall a GitHub App installation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> }
) {
  try {
    // Require authentication
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { installationId } = await params;
    const installationIdBigInt = BigInt(installationId);

    // Check if installation exists
    const installation = await getGitHubAppInstallationById(installationIdBigInt);
    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Extract request context for audit logging
    const context = extractRequestContext(request);

    // Delete installation from database
    await deleteGitHubAppInstallation(installationIdBigInt, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Clear token cache
    clearInstallationTokenCache(installationIdBigInt);

    logger.info('GitHub App installation uninstalled via API', {
      installationId: installationIdBigInt.toString(),
      accountLogin: installation.accountLogin,
      userId: session.sub,
    });

    return NextResponse.json({
      message: 'Installation uninstalled successfully',
      installationId: installationIdBigInt.toString(),
    });
  } catch (error) {
    logger.error('Error uninstalling GitHub App installation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
