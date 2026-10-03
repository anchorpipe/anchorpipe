/**
 * Email Queue Processor API
 *
 * Endpoint to manually trigger email queue processing.
 * In production, this would be called by a scheduled job or worker.
 *
 * Story: ST-205 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/server/auth';
import { processEmailQueue } from '@/lib/server/email-queue-processor';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/email-queue/process
 * Process queued emails
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (admin only in production)
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get batch size from query params (default: 10)
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '10', 10);

    // Process email queue
    const result = await processEmailQueue(batchSize);

    logger.info('Email queue processed', {
      processed: result.processed,
      failed: result.failed,
      batchSize,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      batchSize,
    });
  } catch (error) {
    logger.error('Error processing email queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
