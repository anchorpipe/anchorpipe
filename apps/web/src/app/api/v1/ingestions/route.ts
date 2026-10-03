import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { acceptIngestion, IngestionContractError } from '@anchorpipe/ingestion';
import { authenticateV1HmacRequest } from '@/lib/server/hmac-auth';
import { logger } from '@/lib/server/logger';
import {
  contextFromHmac,
  ingestionObjectPort,
  PostgresIngestionReceiptPort,
  ReceiptPersistenceError,
} from '@/lib/server/v1-ingestion-adapter';

export const runtime = 'nodejs';
export const maxDuration = 30;

const receiptPort = new PostgresIngestionReceiptPort();

function errorResponse(error: unknown): NextResponse {
  if (error instanceof IngestionContractError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.httpStatus }
    );
  }
  if (error instanceof ReceiptPersistenceError) {
    return NextResponse.json(
      { error: { code: 'RECEIPT_UNAVAILABLE', message: error.message } },
      { status: 503 }
    );
  }
  logger.error('Unexpected v1 ingestion error', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  return NextResponse.json(
    { error: { code: 'INGESTION_UNAVAILABLE', message: 'Ingestion is temporarily unavailable.' } },
    { status: 503 }
  );
}

/**
 * POST /api/v1/ingestions
 *
 * This is the first versioned durable boundary. The legacy /api/ingestion
 * endpoint remains separate while clients migrate; both paths must not be
 * described as equivalent until the compatibility adapter is removed.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientKey = request.headers.get('idempotency-key');
    if (!clientKey) {
      throw new IngestionContractError(
        'MISSING_IDEMPOTENCY_KEY',
        'The Idempotency-Key header is required.',
        400
      );
    }

    const contentType = request.headers.get('content-type') || '';
    const rawBody = Buffer.from(await request.arrayBuffer());
    if (rawBody.byteLength > 50 * 1024 * 1024) {
      throw new IngestionContractError(
        'PAYLOAD_TOO_LARGE',
        'Request body exceeds the configured limit.',
        413
      );
    }

    const auth = await authenticateV1HmacRequest(request, rawBody);
    if (!auth.success || !auth.repoId) {
      throw new IngestionContractError('UNAUTHORIZED', 'Authentication failed.', 401);
    }

    const repo = await prisma.repo.findUnique({
      where: { id: auth.repoId },
      select: { id: true, tenantId: true },
    });
    const context = contextFromHmac({
      tenantId: repo?.tenantId || null,
      repoId: auth.repoId,
      secretId: auth.secretId,
    });

    const receipt = await acceptIngestion(
      {
        context,
        clientKey,
        rawBody,
        contentType,
      },
      {
        objects: ingestionObjectPort,
        receipts: receiptPort,
      }
    );

    return NextResponse.json(receipt, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
