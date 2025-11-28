import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkIdempotency,
  recordIdempotency,
  deleteIdempotencyKey,
  cleanupExpiredIdempotencyKeys,
  generateIdempotencyKey,
  IDEMPOTENCY_TTL_HOURS,
} from '../idempotency-service';

const mockPrisma = vi.hoisted(() => ({
  idempotencyKey: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

const baseData = {
  repoId: 'repo-1',
  commitSha: 'a'.repeat(40),
  runId: 'run-123',
  framework: 'jest',
};

describe('idempotency-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates expected key format', () => {
    const key = generateIdempotencyKey(baseData);
    expect(key).toBe(`${baseData.repoId}:${baseData.commitSha}:${baseData.runId}:${baseData.framework}`);
  });

  it('returns not duplicate when key missing', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValueOnce(null);

    const result = await checkIdempotency(baseData);

    expect(result.isDuplicate).toBe(false);
    expect(mockPrisma.idempotencyKey.findUnique).toHaveBeenCalled();
  });

  it('returns duplicate with cached response when key exists', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValueOnce({
      id: 'key-1',
      response: { success: true },
      expiresAt: new Date(Date.now() + 1000),
    });

    const result = await checkIdempotency(baseData);

    expect(result.isDuplicate).toBe(true);
    expect(result.existingResponse).toEqual({ success: true });
  });

  it('purges expired keys automatically', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValueOnce({
      id: 'key-1',
      response: { success: true },
      expiresAt: new Date(Date.now() - 1000),
    });
    mockPrisma.idempotencyKey.delete.mockResolvedValueOnce({});

    const result = await checkIdempotency(baseData);

    expect(result.isDuplicate).toBe(false);
    expect(mockPrisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
  });

  it('records key with TTL and ignores unique violations', async () => {
    mockPrisma.idempotencyKey.create.mockResolvedValueOnce({});

    await recordIdempotency(baseData, { success: true });

    expect(mockPrisma.idempotencyKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: expect.any(String),
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
        response: { success: true },
      }),
    });

    const error = new Error('Unique constraint failed on the fields: (`key`)');
    mockPrisma.idempotencyKey.create.mockRejectedValueOnce(error);
    await recordIdempotency(baseData, { success: true });
    expect(mockPrisma.idempotencyKey.create).toHaveBeenCalledTimes(2);
  });

  it('deletes keys safely', async () => {
    mockPrisma.idempotencyKey.delete.mockResolvedValueOnce({});

    await deleteIdempotencyKey(baseData);

    expect(mockPrisma.idempotencyKey.delete).toHaveBeenCalledWith({
      where: { key: expect.any(String) },
    });
  });

  it('cleans up expired keys via helper', async () => {
    mockPrisma.idempotencyKey.deleteMany.mockResolvedValueOnce({ count: 3 });

    const deleted = await cleanupExpiredIdempotencyKeys();

    expect(deleted).toBe(3);
    expect(mockPrisma.idempotencyKey.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
  });
});


