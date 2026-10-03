/**
 * GitHub App Installation Health Check API
 *
 * Endpoints for checking installation health
 *
 * Story: ST-301 (Phase 2.2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { checkInstallationHealth } from '@/lib/server/github-app-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

/**
 * GET /api/github-app/installations/[installationId]/health
 * Check health of a GitHub App installation
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

    const healthCheck = await checkInstallationHealth(installationIdBigInt);

    const statusCode = healthCheck.healthy ? 200 : 503; // Service Unavailable if unhealthy

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    logger.error('Error checking GitHub App installation health', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
