import { NextResponse, type NextRequest } from 'next/server';
import { cleanupExpiredIdempotencyKeys } from '@/lib/server/idempotency-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET is not configured');
    return NextResponse.json({ success: false, error: 'CRON_SECRET missing' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deletedCount = await cleanupExpiredIdempotencyKeys();
    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] idempotency cleanup failed', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
