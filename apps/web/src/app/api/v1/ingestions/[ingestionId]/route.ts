import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { authenticateV1HmacRequest } from '@/lib/server/hmac-auth';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ingestionId: string }> }
): Promise<NextResponse> {
  try {
    const rawBody = Buffer.from(await request.arrayBuffer());
    const auth = await authenticateV1HmacRequest(request, rawBody);
    if (!auth.success || !auth.repoId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication failed.' } },
        { status: 401 }
      );
    }

    const repo = await prisma.repo.findUnique({
      where: { id: auth.repoId },
      select: { tenantId: true },
    });
    if (!repo?.tenantId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Repository is not assigned to a tenant.' } },
        { status: 403 }
      );
    }

    const { ingestionId } = await context.params;
    const receipt = await prisma.ingestionReceipt.findFirst({
      where: {
        id: ingestionId,
        tenantId: repo.tenantId,
        repoId: auth.repoId,
      },
      select: {
        id: true,
        status: true,
        receivedAt: true,
        createdAt: true,
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { error: { code: 'RECEIPT_NOT_FOUND', message: 'Ingestion receipt was not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ingestionId: receipt.id,
      state: receipt.status,
      statusUrl: `/api/v1/ingestions/${receipt.id}`,
      receivedAt: receipt.receivedAt.toISOString(),
      updatedAt: receipt.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Unexpected v1 ingestion status error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: {
          code: 'INGESTION_UNAVAILABLE',
          message: 'Ingestion status is temporarily unavailable.',
        },
      },
      { status: 503 }
    );
  }
}
