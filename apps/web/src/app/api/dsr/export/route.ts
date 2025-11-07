import { NextRequest, NextResponse } from 'next/server';
import { requestDataExport } from '@/lib/dsr-service';
import { readSession } from '@/lib/auth';

export async function POST(_request: NextRequest) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dsr = await requestDataExport(userId);

    return NextResponse.json({
      requestId: dsr.id,
      status: dsr.status,
      requestedAt: dsr.requestedAt,
      processedAt: dsr.processedAt,
      dueAt: dsr.dueAt,
      confirmationSentAt: dsr.confirmationSentAt,
    });
  } catch (error) {
    console.error('Failed to process export request', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
