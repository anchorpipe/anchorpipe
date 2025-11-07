import { NextRequest, NextResponse } from 'next/server';
import { getExportPayload } from '@/lib/dsr-service';
import { readSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;
    const payload = await getExportPayload(userId, requestId);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="anchorpipe-export-${requestId}.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export not available';
    const status = message.includes('Unauthorized') ? 401 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
