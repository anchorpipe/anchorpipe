import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitInfo,
  RateLimitError,
  type RateLimitConfig,
} from '../rate-limit';
import { getRedisClient } from '@anchorpipe/redis';

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

  it('logs and allows requests when redis pipeline fails', async () => {
    const client = getRedisClient() as unknown as InstanceType<typeof RedisMock>;
    const pipelineError = new Error('boom');
    const pipelineSpy = vi.spyOn(client, 'pipeline').mockImplementation(() => {
      throw pipelineError;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Rate Limit] Redis error, allowing request:',
      pipelineError
    );

    pipelineSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('returns default info when redis lookups fail', async () => {
    const client = getRedisClient() as unknown as InstanceType<typeof RedisMock>;
    const error = new Error('zrange failed');
    const spy = vi.spyOn(client, 'zremrangebyscore').mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const info = await getRateLimitInfo(key, config);

    expect(info).toEqual({
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: expect.any(Number),
    });
    expect(consoleSpy).toHaveBeenCalledWith('[Rate Limit] Error getting rate limit info:', error);

    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});
