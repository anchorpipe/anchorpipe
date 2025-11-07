import { NextRequest, NextResponse } from 'next/server';
import { listDataSubjectRequests } from '@/lib/dsr-service';
import { readSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = (await listDataSubjectRequests(userId)) as unknown as any[];

    return NextResponse.json(
      requests.map((request: any) => ({
        id: request.id,
        type: request.type,
        status: request.status,
        requestedAt: request.requestedAt,
        dueAt: request.dueAt,
        processedAt: request.processedAt,
        confirmationSentAt: request.confirmationSentAt,
        metadata: request.metadata,
        events: request.events,
        exportAvailable: Boolean(request.exportData),
      }))
    );
  } catch (error) {
    console.error('Failed to list data subject requests', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
