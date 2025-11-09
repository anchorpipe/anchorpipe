/**
 * SIEM Forwarding API
 *
 * Endpoint to manually trigger SIEM log forwarding.
 * In production, this would be called by a scheduled job or worker.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { userHasAdminRole } from '@/lib/server/rbac-service';
import { forwardAuditLogsToSiem, getSiemForwarder } from '@/lib/server/siem-forwarder';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/siem/forward
 * Forward audit logs to SIEM
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (admin only)
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await userHasAdminRole(session.sub);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get batch size from query params (default: from config)
    const { searchParams } = new URL(request.url);
    const batchSize = searchParams.get('batchSize')
      ? parseInt(searchParams.get('batchSize')!, 10)
      : undefined;

    // Forward audit logs to SIEM
    const result = await forwardAuditLogsToSiem(batchSize);

    logger.info('SIEM forwarding triggered', {
      success: result.success,
      failed: result.failed,
      batchSize: batchSize || 'default',
    });

    return NextResponse.json({
      success: true,
      processed: result.success,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Error forwarding audit logs to SIEM', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/siem/test
 * Test SIEM connection
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (admin only)
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await userHasAdminRole(session.sub);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Test SIEM connection
    const forwarder = getSiemForwarder();
    const result = await forwarder.testConnection();

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    logger.error('Error testing SIEM connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
