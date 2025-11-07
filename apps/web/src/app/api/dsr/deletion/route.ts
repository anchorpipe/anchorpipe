import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestDataDeletion } from '@/lib/dsr-service';
import { readSession } from '@/lib/auth';
import { extractRequestContext } from '@/lib/audit-service';

const deletionSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional();

export const dynamic = 'force-dynamic';

async function authenticate() {
  const session = await readSession();
  const userId = session?.sub as string | undefined;

  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      userId: null,
    };
  }

  return { userId };
}

function parseRequestBody(body: unknown) {
  const parsed = deletionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      ),
      data: null,
    };
  }
  return { data: parsed.data };
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await authenticate();
    if (authError || !userId) {
      return authError as NextResponse;
    }

    const body = await request.json().catch(() => ({}));
    const { data: validated, error: parseError } = parseRequestBody(body);
    if (parseError) {
      return parseError as NextResponse;
    }

    const dsr = await requestDataDeletion(
      userId,
      validated?.reason,
      extractRequestContext(request)
    );

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
