/**
 * GitHub App Installation Permissions API
 *
 * Endpoints for managing and refreshing installation permissions
 *
 * Story: ST-301 (Phase 3.2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { extractRequestContext } from '@/lib/server/audit-service';
import {
  getGitHubAppInstallationById,
  refreshInstallationPermissions,
} from '@/lib/server/github-app-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

/**
 * POST /api/github-app/installations/[installationId]/permissions/refresh
 * Refresh and validate installation permissions from GitHub API
 */
export async function POST(
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

    // Refresh permissions
    const result = await refreshInstallationPermissions(installationIdBigInt, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logger.info('GitHub App installation permissions refreshed via API', {
      installationId: installationIdBigInt.toString(),
      accountLogin: installation.accountLogin,
      permissionsValid: result.validation?.valid ?? false,
      userId: session.sub,
    });

    return NextResponse.json({
      message: 'Permissions refreshed successfully',
      installationId: installationIdBigInt.toString(),
      validation: result.validation,
    });
  } catch (error) {
    logger.error('Error refreshing installation permissions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
