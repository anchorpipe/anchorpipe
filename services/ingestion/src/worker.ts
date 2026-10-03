import { prisma, Prisma } from '@anchorpipe/database';

const CONSUMER = 'ingestion-normalizer';
const CONSUMER_VERSION = 'v1-boundary';
const UNSUPPORTED_REASON = 'NORMALIZATION_NOT_IMPLEMENTED';
const LEASE_EXPIRED_REASON = 'LEASE_EXPIRED';

export const WORKER_DEFAULTS = {
  leaseMs: 60_000,
  maxAttempts: 5,
  backoffBaseMs: 1_000,
  backoffMaxMs: 60_000,
} as const;

export interface NormalizationEvent {
  id: string;
  tenantId: string;
  receiptId: string;
  eventType: string;
  eventVersion: number;
  payload: unknown;
}

export interface NormalizationPort {
  normalize(event: NormalizationEvent): Promise<void>;
}

/** A parser is deliberately not part of the worker boundary. */
export class NormalizationFailure extends Error {
  constructor(
    message: string,
    readonly retryable = true,
    readonly reasonCode = message,
  ) {
    super(message);
    this.name = 'NormalizationFailure';
  }
}

const defaultNormalizer: NormalizationPort = {
  async normalize() {
    throw new NormalizationFailure(UNSUPPORTED_REASON, false, UNSUPPORTED_REASON);
  },
};

type WorkerDatabase = typeof prisma;

export interface WorkerDependencies {
  db?: WorkerDatabase;
  normalizer?: NormalizationPort;
  now?: () => Date;
  leaseMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
}

interface WorkerConfig {
  leaseMs: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

interface ClaimedEvent {
  event: NormalizationEvent;
  ledgerId: string;
  attempts: number;
  leaseUntil: Date;
}

interface ClaimResult {
  found: boolean;
  claim?: ClaimedEvent;
}

function configFrom(deps: WorkerDependencies): WorkerConfig {
  return {
    leaseMs: Math.max(1, deps.leaseMs ?? WORKER_DEFAULTS.leaseMs),
    maxAttempts: Math.max(1, deps.maxAttempts ?? WORKER_DEFAULTS.maxAttempts),
    backoffBaseMs: Math.max(1, deps.backoffBaseMs ?? WORKER_DEFAULTS.backoffBaseMs),
    backoffMaxMs: Math.max(
      deps.backoffBaseMs ?? WORKER_DEFAULTS.backoffBaseMs,
      deps.backoffMaxMs ?? WORKER_DEFAULTS.backoffMaxMs,
    ),
  };
}

export function boundedBackoffMs(
  attempts: number,
  baseMs = WORKER_DEFAULTS.backoffBaseMs,
  maxMs = WORKER_DEFAULTS.backoffMaxMs,
): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(maxMs, baseMs * 2 ** Math.min(exponent, 30));
}

function errorDetails(error: unknown): { reasonCode: string; retryable: boolean } {
  if (error instanceof NormalizationFailure) {
    return { reasonCode: error.reasonCode, retryable: error.retryable };
  }
  if (error instanceof Error) {
    return { reasonCode: error.message || 'NORMALIZATION_FAILED', retryable: true };
  }
  return { reasonCode: String(error), retryable: true };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function nextAttemptAt(now: Date, attempts: number, config: WorkerConfig): Date {
  return new Date(now.getTime() + boundedBackoffMs(attempts, config.backoffBaseMs, config.backoffMaxMs));
}

async function deadLetter(
  tx: any,
  event: { id?: string; tenantId: string; receiptId: string },
  ledgerId: string,
  attempts: number,
  reasonCode: string,
  now: Date,
): Promise<void> {
  await tx.processingLedger.update({
    where: { id: ledgerId },
    data: {
      status: 'dead_letter',
      leaseUntil: null,
      nextAttemptAt: null,
      completedAt: now,
      lastError: reasonCode,
    },
  });
  await tx.ingestionReceipt.update({
    where: { id: event.receiptId },
    data: { status: 'quarantined' },
  });
  await tx.deadLetter.upsert({
    where: { receiptId_consumer: { receiptId: event.receiptId, consumer: CONSUMER } },
    create: {
      tenantId: event.tenantId,
      receiptId: event.receiptId,
      consumer: CONSUMER,
      reasonCode,
      attempts,
      firstFailedAt: now,
      lastFailedAt: now,
    },
    update: { reasonCode, attempts, lastFailedAt: now },
  });
  if (event.id) {
    await tx.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'failed', availableAt: now, lastError: reasonCode },
    });
  } else {
    await tx.outboxEvent.updateMany({
      where: { tenantId: event.tenantId, receiptId: event.receiptId },
      data: { status: 'failed', availableAt: now, lastError: reasonCode },
    });
  }
}

/** Recover expired leases before selecting new work. The conditional update is the CAS. */
async function recoverStaleLeases(
  db: WorkerDatabase,
  now: Date,
  config: WorkerConfig,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const stale = await tx.processingLedger.findMany({
      where: {
        status: 'processing',
        OR: [{ leaseUntil: { lte: now } }, { leaseUntil: null }],
      },
      select: { id: true, tenantId: true, receiptId: true, attempts: true, leaseUntil: true },
    });

    for (const ledger of stale) {
      const expiredAt = nextAttemptAt(now, Math.max(1, ledger.attempts), config);
      if (ledger.attempts >= config.maxAttempts) {
        const updated = await tx.processingLedger.updateMany({
          where: { id: ledger.id, status: 'processing', leaseUntil: ledger.leaseUntil },
          data: { status: 'dead_letter', leaseUntil: null, completedAt: now, lastError: LEASE_EXPIRED_REASON },
        });
        if (updated.count === 1) {
          await deadLetter(tx, ledger, ledger.id, ledger.attempts, LEASE_EXPIRED_REASON, now);
        }
        continue;
      }

      const updated = await tx.processingLedger.updateMany({
        where: { id: ledger.id, status: 'processing', leaseUntil: ledger.leaseUntil },
        data: {
          status: 'retryable',
          leaseUntil: null,
          nextAttemptAt: expiredAt,
          lastError: LEASE_EXPIRED_REASON,
        },
      });
      if (updated.count === 1) {
        await tx.ingestionReceipt.update({ where: { id: ledger.receiptId }, data: { status: 'failed' } });
        await tx.outboxEvent.updateMany({
          where: { tenantId: ledger.tenantId, receiptId: ledger.receiptId },
          data: { status: 'failed', availableAt: expiredAt, lastError: LEASE_EXPIRED_REASON },
        });
      }
    }
  });
}

async function claimNext(
  db: WorkerDatabase,
  now: Date,
  config: WorkerConfig,
): Promise<ClaimResult> {
  return db.$transaction(async (tx): Promise<ClaimResult> => {
    const event = await tx.outboxEvent.findFirst({
      where: {
        status: { in: ['pending', 'failed'] },
        availableAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, tenantId: true, receiptId: true, eventType: true, eventVersion: true, payload: true },
    });
    if (!event) return { found: false };

    const existing = await tx.processingLedger.findUnique({
      where: {
        receiptId_consumer_consumerVersion: {
          receiptId: event.receiptId,
          consumer: CONSUMER,
          consumerVersion: CONSUMER_VERSION,
        },
      },
      select: {
        id: true,
        tenantId: true,
        receiptId: true,
        status: true,
        attempts: true,
        leaseUntil: true,
        nextAttemptAt: true,
        lastError: true,
      },
    });

    let ledgerId: string;
    let attempts: number;
    let leaseUntil: Date;

    if (!existing) {
      attempts = 1;
      leaseUntil = new Date(now.getTime() + config.leaseMs);
      const created = await tx.processingLedger.create({
          data: {
            tenantId: event.tenantId,
            receiptId: event.receiptId,
            consumer: CONSUMER,
            consumerVersion: CONSUMER_VERSION,
            status: 'processing',
            attempts,
            leaseUntil,
          },
          select: { id: true },
      });
      ledgerId = created.id;
    } else {
      if (existing.status === 'completed' || existing.status === 'dead_letter') return { found: true };
      const due = !existing.nextAttemptAt || existing.nextAttemptAt <= now;
      const stale = existing.status === 'processing' && (!existing.leaseUntil || existing.leaseUntil <= now);
      if (existing.status === 'processing' && !stale) return { found: true };
      if (existing.status !== 'retryable' && !stale) return { found: true };
      if (!due && !stale) return { found: true };
      if (existing.attempts >= config.maxAttempts) {
        await deadLetter(tx, event, existing.id, existing.attempts, existing.lastError ?? 'MAX_ATTEMPTS_EXCEEDED', now);
        return { found: true };
      }

      attempts = existing.attempts + 1;
      leaseUntil = new Date(now.getTime() + config.leaseMs);
      const claimed = await tx.processingLedger.updateMany({
        where: {
          id: existing.id,
          status: existing.status,
          ...(existing.status === 'processing'
            ? { leaseUntil: existing.leaseUntil }
            : { nextAttemptAt: existing.nextAttemptAt }),
        },
        data: { status: 'processing', attempts, leaseUntil, nextAttemptAt: null, completedAt: null },
      });
      if (claimed.count !== 1) return { found: true };
      ledgerId = existing.id;
    }

    await tx.ingestionReceipt.update({ where: { id: event.receiptId }, data: { status: 'processing' } });
    await tx.outboxEvent.update({ where: { id: event.id }, data: { attempts: { increment: 1 }, lastError: null } });
    return {
      found: true,
      claim: { event, ledgerId, attempts, leaseUntil },
    };
  });
}

async function finishSuccess(db: WorkerDatabase, claim: ClaimedEvent, now: Date): Promise<void> {
  await db.$transaction(async (tx) => {
    const updated = await tx.processingLedger.updateMany({
      where: { id: claim.ledgerId, status: 'processing', leaseUntil: claim.leaseUntil },
      data: { status: 'completed', leaseUntil: null, nextAttemptAt: null, completedAt: now, lastError: null },
    });
    if (updated.count !== 1) return;
    await tx.ingestionReceipt.update({ where: { id: claim.event.receiptId }, data: { status: 'completed' } });
    await tx.outboxEvent.update({ where: { id: claim.event.id }, data: { status: 'published', publishedAt: now, lastError: null } });
  });
}

async function finishFailure(
  db: WorkerDatabase,
  claim: ClaimedEvent,
  error: unknown,
  now: Date,
  config: WorkerConfig,
): Promise<void> {
  const details = errorDetails(error);
  await db.$transaction(async (tx) => {
    const terminal = !details.retryable || claim.attempts >= config.maxAttempts;
    if (terminal) {
      const owned = await tx.processingLedger.updateMany({
        where: { id: claim.ledgerId, status: 'processing', leaseUntil: claim.leaseUntil },
        data: { status: 'dead_letter', leaseUntil: null, nextAttemptAt: null, completedAt: now, lastError: details.reasonCode },
      });
      if (owned.count === 1) {
        await deadLetter(tx, claim.event, claim.ledgerId, claim.attempts, details.reasonCode, now);
      }
      return;
    }

    const retryAt = nextAttemptAt(now, claim.attempts, config);
    const owned = await tx.processingLedger.updateMany({
      where: { id: claim.ledgerId, status: 'processing', leaseUntil: claim.leaseUntil },
      data: { status: 'retryable', leaseUntil: null, nextAttemptAt: retryAt, lastError: details.reasonCode },
    });
    if (owned.count !== 1) return;
    await tx.ingestionReceipt.update({ where: { id: claim.event.receiptId }, data: { status: 'failed' } });
    await tx.outboxEvent.update({ where: { id: claim.event.id }, data: { status: 'failed', availableAt: retryAt, lastError: details.reasonCode } });
  });
}

export async function processOneOutboxEvent(deps: WorkerDependencies = {}): Promise<boolean> {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());
  const config = configFrom(deps);
  const timestamp = now();

  await recoverStaleLeases(db, timestamp, config);
  let result: ClaimResult;
  try {
    result = await claimNext(db, timestamp, config);
  } catch (error) {
    if (isUniqueViolation(error)) return true;
    throw error;
  }
  if (!result.claim) return result.found;

  try {
    await (deps.normalizer ?? defaultNormalizer).normalize(result.claim.event);
    await finishSuccess(db, result.claim, now());
  } catch (error) {
    await finishFailure(db, result.claim, error, now(), config);
  }
  return true;
}

export interface RunWorkerOptions extends WorkerDependencies {
  intervalMs?: number;
  once?: boolean;
}

export async function runWorker(options: RunWorkerOptions = {}) {
  const intervalMs = options.intervalMs ?? 1000;
  if (options.once) {
    await processOneOutboxEvent(options);
    return;
  }

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  while (!stopping) {
    const processed = await processOneOutboxEvent(options);
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
