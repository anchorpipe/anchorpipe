/**
 * Admin API: Security Alerts Check
 *
 * Manually trigger security pattern detection and alerting.
 * Requires admin role.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { userHasAdminRole } from '@/lib/server/rbac-service';
import { checkAndAlertSuspiciousPatterns } from '@/lib/server/security-alerts';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security-alerts/check
 * Manually trigger security pattern detection and alerting
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await userHasAdminRole(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.info('Manually triggering security pattern detection');

    const result = await checkAndAlertSuspiciousPatterns();

    logger.info('Security pattern detection complete', result);

    return NextResponse.json({
      message: 'Security pattern detection completed',
      ...result,
    });
  } catch (error) {
    logger.error('Failed to check security patterns', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
