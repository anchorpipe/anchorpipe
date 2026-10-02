import { prisma, Prisma } from '@anchorpipe/database';

const CONSUMER = 'ingestion-normalizer';
const CONSUMER_VERSION = 'v1-boundary';
const UNSUPPORTED_REASON = 'NORMALIZATION_NOT_IMPLEMENTED';

export async function processOneOutboxEvent(): Promise<boolean> {
  const event = await prisma.outboxEvent.findFirst({
    where: {
      status: 'pending',
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, tenantId: true, receiptId: true },
  });

  if (!event) {
    return false;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ledger = await tx.processingLedger.create({
        data: {
          tenantId: event.tenantId,
          receiptId: event.receiptId,
          consumer: CONSUMER,
          consumerVersion: CONSUMER_VERSION,
          status: 'processing',
          attempts: 1,
        },
        select: { id: true },
      });

      // The first slice deliberately has no report normalizer. Quarantine is
      // explicit and auditable; marking this event completed would be false.
      await tx.ingestionReceipt.update({
        where: { id: event.receiptId },
        data: { status: 'quarantined' },
      });
      await tx.deadLetter.create({
        data: {
          tenantId: event.tenantId,
          receiptId: event.receiptId,
          consumer: CONSUMER,
          reasonCode: UNSUPPORTED_REASON,
          attempts: 1,
          firstFailedAt: new Date(),
          lastFailedAt: new Date(),
        },
      });
      await tx.processingLedger.update({
        where: { id: ledger.id },
        data: {
          status: 'dead_letter',
          completedAt: new Date(),
          lastError: UNSUPPORTED_REASON,
        },
      });
      await tx.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          attempts: { increment: 1 },
          lastError: UNSUPPORTED_REASON,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Another worker owns this receipt/consumer/version. At-least-once
      // delivery is safe because the ledger uniqueness constraint arbitrates.
      return true;
    }
    throw error;
  }

  return true;
}

export async function runWorker(options: { intervalMs?: number; once?: boolean } = {}) {
  const intervalMs = options.intervalMs ?? 1000;
  if (options.once) {
    await processOneOutboxEvent();
    return;
  }

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  while (!stopping) {
    const processed = await processOneOutboxEvent();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
