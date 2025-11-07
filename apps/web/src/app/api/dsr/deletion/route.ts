import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestDataDeletion } from '@/lib/dsr-service';
import { readSession } from '@/lib/auth';

const deletionSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  try {
    const session = await readSession();
    const userId = session?.sub as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = deletionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const dsr = await requestDataDeletion(userId, parsed.data?.reason);

    return NextResponse.json({
      requestId: dsr?.id,
      status: dsr?.status,
      requestedAt: dsr?.requestedAt,
      processedAt: dsr?.processedAt,
      dueAt: dsr?.dueAt,
      confirmationSentAt: dsr?.confirmationSentAt,
      metadata: dsr?.metadata,
    });
  } catch (error) {
    console.error('Failed to process deletion request', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
