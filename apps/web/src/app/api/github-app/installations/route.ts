/**
 * GitHub App Installations API
 *
 * Endpoints for managing GitHub App installations
 *
 * Story: ST-301
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import {
  listGitHubAppInstallations,
  getGitHubAppInstallationsByAccount,
} from '@/lib/server/github-app-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

/**
 * GET /api/github-app/installations
 * List all GitHub App installations
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountLogin = searchParams.get('account');

    let installations;
    if (accountLogin) {
      installations = await getGitHubAppInstallationsByAccount(accountLogin);
    } else {
      installations = await listGitHubAppInstallations();
    }

    return NextResponse.json({ installations });
  } catch (error) {
    logger.error('Error listing GitHub App installations', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
