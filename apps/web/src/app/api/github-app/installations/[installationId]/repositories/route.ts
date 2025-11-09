/**
 * GitHub App Installation Repository Selection API
 *
 * Endpoints for managing repository selection for installations
 *
 * Story: ST-301 (Phase 3.1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { extractRequestContext } from '@/lib/server/audit-service';
import {
  getGitHubAppInstallationById,
  updateInstallationRepositorySelection,
} from '@/lib/server/github-app-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

/**
 * PUT /api/github-app/installations/[installationId]/repositories
 * Update repository selection for a GitHub App installation
 */
export async function PUT(
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

    // Parse request body
    const body = await request.json();
    const { repositoryIds } = body as { repositoryIds?: number[] };

    if (!Array.isArray(repositoryIds)) {
      return NextResponse.json(
        { error: 'repositoryIds must be an array of repository IDs' },
        { status: 400 }
      );
    }

    // Validate repository IDs are numbers
    if (!repositoryIds.every((id) => typeof id === 'number' && id > 0)) {
      return NextResponse.json(
        { error: 'All repository IDs must be positive numbers' },
        { status: 400 }
      );
    }

    // Extract request context for audit logging
    const context = extractRequestContext(request);

    // Update repository selection
    const result = await updateInstallationRepositorySelection(
      installationIdBigInt,
      repositoryIds,
      {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logger.info('GitHub App installation repository selection updated via API', {
      installationId: installationIdBigInt.toString(),
      accountLogin: installation.accountLogin,
      repositoryCount: repositoryIds.length,
      userId: session.sub,
    });

    return NextResponse.json({
      message: 'Repository selection updated successfully',
      installationId: installationIdBigInt.toString(),
      repositoryCount: result.updatedRepositories,
    });
  } catch (error) {
    logger.error('Error updating repository selection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
