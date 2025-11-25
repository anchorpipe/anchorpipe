// cspell:ignore anchorpipe
import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';
import { webcrypto } from 'node:crypto';

vi.mock('@anchorpipe/redis', () => ({
  createRedisClient: vi.fn(),
  getRedisClient: vi.fn(),
  closeRedisClient: vi.fn(),
  Redis: class {},
}));

vi.mock('@/lib/server/rate-limit', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/server/rate-limit')>('@/lib/server/rate-limit');
  return {
    ...actual,
    checkRateLimit: vi.fn(),
    getRateLimitInfo: vi.fn(),
  };
});

import { RateLimitError, checkRateLimit, getRateLimitInfo } from '@/lib/server/rate-limit';

const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedGetRateLimitInfo = vi.mocked(getRateLimitInfo);

const globalWithCrypto = globalThis as typeof globalThis & { crypto?: Crypto };
if (!globalWithCrypto.crypto) {
  globalWithCrypto.crypto = webcrypto as Crypto;
}

describe('middleware rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('test-request-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies rate limit headers for API requests when allowed', async () => {
    const reset = Date.now() + 1000;
    mockedCheckRateLimit.mockResolvedValue(undefined);
    mockedGetRateLimitInfo.mockResolvedValue({
      limit: 60,
      remaining: 59,
      reset,
    });

    const request = new NextRequest('http://localhost/api/test', {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.1',
      }),
    });

    const response = await middleware(request);

    expect(mockedCheckRateLimit).toHaveBeenCalledWith('203.0.113.1:/api/test', expect.any(Object));
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(new Date(reset).toISOString());
    expect(response.headers.get('x-request-id')).toBe('test-request-id');
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    mockedCheckRateLimit.mockRejectedValue(new RateLimitError('Too many requests', 42));

    const request = new NextRequest('http://localhost/api/test', {
      headers: new Headers({
        'x-forwarded-for': '198.51.100.2',
      }),
    });

    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    });
    expect(response.headers.get('Retry-After')).toBe('42');
    expect(response.headers.get('X-Request-ID')).toBe('test-request-id');
    expect(mockedGetRateLimitInfo).not.toHaveBeenCalled();
  });

  it('skips rate limiting for non-API routes', async () => {
    const request = new NextRequest('http://localhost/about');

    const response = await middleware(request);

    expect(mockedCheckRateLimit).not.toHaveBeenCalled();
    expect(mockedGetRateLimitInfo).not.toHaveBeenCalled();
    expect(response.headers.get('x-request-id')).toBe('test-request-id');
  });
});
