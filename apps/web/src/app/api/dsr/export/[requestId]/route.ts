import { NextRequest, NextResponse } from 'next/server';
import { getExportPayload } from '@/lib/server/dsr-service';
import { readSession } from '@/lib/server/auth';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';

export const dynamic = 'force-dynamic';

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

    const context = extractRequestContext(request);

    await writeAuditLog({
      actorId: userId,
      action: AUDIT_ACTIONS.dsrExportDownload,
      subject: AUDIT_SUBJECTS.dsr,
      subjectId: requestId,
      description: 'User downloaded data export.',
      metadata: {
        sizeBytes: JSON.stringify(payload).length,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

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
