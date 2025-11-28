import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from '../route';

const mockCleanup = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/idempotency-service', () => ({
  cleanupExpiredIdempotencyKeys: mockCleanup,
}));

const buildRequest = (headers?: Record<string, string>) =>
  ({
    headers: new Headers(headers),
  }) as unknown as NextRequest;

describe('/api/cron/cleanup-idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns cleanup stats on success', async () => {
    mockCleanup.mockResolvedValueOnce(5);

    const res = await GET(buildRequest({ authorization: 'Bearer test-secret' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deletedCount).toBe(5);
  });

  it('returns 500 on failure', async () => {
    mockCleanup.mockRejectedValueOnce(new Error('db down'));

    const res = await GET(buildRequest({ authorization: 'Bearer test-secret' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      success: false,
      error: 'db down',
    });
  });

  it('requires cron secret header', async () => {
    const res = await GET(buildRequest({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('fails when CRON_SECRET unset', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(buildRequest({ authorization: 'Bearer anything' }));
    expect(res.status).toBe(500);
  });
});
