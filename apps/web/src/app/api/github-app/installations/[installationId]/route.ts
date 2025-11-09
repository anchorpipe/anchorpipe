/**
 * GitHub App Installation API
 *
 * Endpoints for managing a specific GitHub App installation
 *
 * Story: ST-301
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import {
  getGitHubAppInstallationById,
  validateInstallationPermissions,
} from '@/lib/server/github-app-service';
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
