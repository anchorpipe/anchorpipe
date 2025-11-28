import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { GET } from '../route';
import { middleware } from '@/middleware';
import { buildJsonRequest } from '../../__tests__/integration-test-helpers';

const mockFetch = vi.fn();
const originalFetch = global.fetch;
const globalWithCrypto = globalThis as typeof globalThis & { crypto?: Crypto };
if (!globalWithCrypto.crypto) {
  globalWithCrypto.crypto = webcrypto as Crypto;
}

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetRateLimitInfo = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/rate-limit', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/server/rate-limit')>('@/lib/server/rate-limit');
  return {
    ...actual,
    checkRateLimit: mockCheckRateLimit,
    getRateLimitInfo: mockGetRateLimitInfo,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GET /api/health - Integration', () => {
  it('returns healthy when services are available', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.services).toMatchObject({
      db: { ok: true },
      mq: { ok: true },
      storage: { ok: true },
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('is not rate limited even after many sequential requests', async () => {
    const requestFactory = () =>
      buildJsonRequest('/api/health', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '203.0.113.99',
        },
      });

    for (let i = 0; i < 205; i++) {
      const response = await middleware(requestFactory());
      expect(response.status).toBe(200);
    }

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGetRateLimitInfo).not.toHaveBeenCalled();
  });
  it('propagates degraded service state with 503', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ status: 'unhealthy' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.services).toMatchObject({
      db: { ok: true },
      mq: { ok: false },
      storage: { ok: true },
    });
  });
});
