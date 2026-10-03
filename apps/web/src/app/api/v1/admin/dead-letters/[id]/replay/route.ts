import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { extractRequestContext, writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from '@/lib/server/audit-service';
import { getUserAbility } from '@/lib/server/rbac-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = extractRequestContext(request);
    const ability = await getUserAbility('system-admin', 'SYSTEM');

    if (!ability.can('manage', 'config')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deadLetter = await prisma.deadLetter.findUnique({
      where: { id },
    });

    if (!deadLetter) {
      return NextResponse.json({ error: 'Dead letter entry not found' }, { status: 404 });
    }

    const replayedEvent = await prisma.$transaction(async (tx) => {
      const outbox = await tx.outboxEvent.create({
        data: {
          tenantId: deadLetter.tenantId,
          receiptId: deadLetter.receiptId,
          eventType: 'ingestion.replayed',
          eventVersion: 1,
          payload: {
            receiptId: deadLetter.receiptId,
            deadLetterId: deadLetter.id,
            reasonCode: deadLetter.reasonCode,
            replayedBy: 'operator',
          },
        },
      });

      await tx.deadLetter.delete({
        where: { id: deadLetter.id },
      });

      return outbox;
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.other,
      subject: AUDIT_SUBJECTS.system,
      subjectId: id,
      description: 'Replayed dead letter ingestion record',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { replayedEventId: replayedEvent.id },
    });

    return NextResponse.json({
      message: 'Dead letter replayed successfully',
      replayedEventId: replayedEvent.id,
    });
  } catch (error) {
    console.error('[DLQ API] Replay POST failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
