import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import { checkRateLimit, resetRateLimit, RateLimitError, type RateLimitConfig } from '../rate-limit';

vi.mock('@anchorpipe/redis', () => {
  let client: InstanceType<typeof RedisMock> | null = null;

  function ensureClient() {
    if (!client) {
      client = new RedisMock();
    }
    return client;
  }

  return {
    createRedisClient: ensureClient,
    getRedisClient: ensureClient,
    closeRedisClient: async () => {
      if (client) {
        await client.quit();
        client = null;
      }
    },
    Redis: RedisMock,
  };
});

describe('Redis rate limiting', () => {
  const key = '127.0.0.1:/api/test';
  const config: RateLimitConfig = { windowMs: 1000, maxRequests: 5, keyPrefix: 'test' };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    await resetRateLimit(key, config);
  });

  afterEach(async () => {
    await resetRateLimit(key, config);
    vi.useRealTimers();
  });

  it('allows requests while under limit', async () => {
    for (let i = 0; i < config.maxRequests; i++) {
      await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
    }
  });

  it('throws RateLimitError when limit exceeded', async () => {
    for (let i = 0; i < config.maxRequests; i++) {
      await checkRateLimit(key, config);
    }

    await expect(checkRateLimit(key, config)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('resets window after configured interval', async () => {
    for (let i = 0; i < config.maxRequests; i++) {
      await checkRateLimit(key, config);
    }
    await expect(checkRateLimit(key, config)).rejects.toBeInstanceOf(RateLimitError);

    vi.setSystemTime(new Date('2025-01-01T00:00:02.000Z'));

    await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
  });
});
