import { prisma, Prisma } from '@anchorpipe/database';

/**
 * Attributes that uniquely identify an ingestion request.
 */
export interface IdempotencyKeyData {
  repoId: string;
  commitSha: string;
  runId?: string | null;
  framework: string;
}

/**
 * Result of checking whether a key already exists.
 */
export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  existingResponse?: Prisma.JsonValue;
}

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Create a deterministic key that uniquely references an ingestion attempt.
 */
function generateIdempotencyKey(data: IdempotencyKeyData): string {
  const runIdPart = data.runId?.trim() ? data.runId : 'no-run-id';
  return `${data.repoId}:${data.commitSha}:${runIdPart}:${data.framework}`;
}

/**
 * Determine whether an ingestion with the same attributes already exists.
 */
export async function checkIdempotency(data: IdempotencyKeyData): Promise<IdempotencyCheckResult> {
  const key = generateIdempotencyKey(data);
  try {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
      select: { id: true, response: true, expiresAt: true },
    });

    if (!existing) {
      return { isDuplicate: false };
    }

    if (existing.expiresAt < new Date()) {
      await prisma.idempotencyKey.delete({ where: { id: existing.id } });
      return { isDuplicate: false };
    }

    return {
      isDuplicate: true,
      existingResponse: existing.response ?? undefined,
    };
  } catch (error) {
    console.error('[Idempotency] check failed', error);
    return { isDuplicate: false };
  }
}

export async function recordIdempotency(
  data: IdempotencyKeyData,
  response: Prisma.InputJsonValue | Prisma.JsonNullValueInput = Prisma.JsonNull,
  ttlHours: number = IDEMPOTENCY_TTL_HOURS
): Promise<void> {
  const key = generateIdempotencyKey(data);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  try {
    await prisma.idempotencyKey.create({
      data: {
        key,
        repoId: data.repoId,
        commitSha: data.commitSha,
        runId: data.runId?.trim() ? data.runId : null,
        framework: data.framework,
        response,
        expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('unique constraint')) {
      console.warn('[Idempotency] duplicate key insert ignored');
      return;
    }
    console.error('[Idempotency] record failed', error);
  }
}

export async function deleteIdempotencyKey(data: IdempotencyKeyData): Promise<void> {
  const key = generateIdempotencyKey(data);
  try {
    await prisma.idempotencyKey.delete({ where: { key } });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('record to delete does not exist')
    ) {
      return;
    }
    console.error('[Idempotency] delete failed', error);
  }
}

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`[Idempotency] cleaned ${result.count} expired keys`);
    return result.count;
  } catch (error) {
    console.error('[Idempotency] cleanup failed', error);
    return 0;
  }
}

/**
 * Convert arbitrary response payloads into JSON-safe values for persistence.
 * BigInts are coerced into numbers to satisfy JSON.stringify constraints.
 */
export function serializeToJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_, val) => {
      if (typeof val === 'bigint') {
        return Number(val);
      }
      return val;
    })
  ) as Prisma.InputJsonValue;
}

export { generateIdempotencyKey, IDEMPOTENCY_TTL_HOURS };
