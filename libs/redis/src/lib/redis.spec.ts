import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOn = vi.hoisted(() => vi.fn());
const mockQuit = vi.hoisted(() => vi.fn());
const mockRedisCtor = vi.hoisted(() =>
  vi.fn(() => ({
    on: mockOn,
    quit: mockQuit,
  }))
);

vi.mock('ioredis', () => ({
  default: mockRedisCtor,
}));

import { closeRedisClient, createRedisClient, getRedisClient } from './redis';

describe('redis client factory', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    await closeRedisClient();
    vi.clearAllMocks();
  });

  it('creates a singleton Redis client', () => {
    const first = createRedisClient();
    const second = getRedisClient();

    expect(first).toBe(second);
    expect(mockRedisCtor).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
  });

  it('closes the client on demand', async () => {
    createRedisClient();
    await closeRedisClient();

    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  it('prefers REDIS_URL when provided', () => {
    vi.stubEnv('REDIS_URL', 'redis://cache:6380');

    createRedisClient();

    expect(mockRedisCtor).toHaveBeenCalledWith(
      'redis://cache:6380',
      expect.objectContaining({ enableOfflineQueue: false })
    );
  });

  it('falls back to host configuration when REDIS_URL is absent', () => {
    vi.stubEnv('REDIS_URL', '');
    vi.stubEnv('REDIS_HOST', 'cache.internal');
    vi.stubEnv('REDIS_PORT', '6381');
    vi.stubEnv('REDIS_PASSWORD', 'secret');
    vi.stubEnv('REDIS_DB', '2');

    createRedisClient();

    expect(mockRedisCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'cache.internal',
        port: 6381,
        password: 'secret',
        db: 2,
      })
    );
  });

  it('lazy initializes via getRedisClient when no client exists yet', () => {
    const client = getRedisClient();

    expect(client).toBeDefined();
    expect(mockRedisCtor).toHaveBeenCalledTimes(1);
  });

  it('recreates client after closeRedisClient is called', async () => {
    const first = createRedisClient();
    await closeRedisClient();

    const second = getRedisClient();

    expect(first).not.toBe(second);
    expect(mockRedisCtor).toHaveBeenCalledTimes(2);
  });
});
