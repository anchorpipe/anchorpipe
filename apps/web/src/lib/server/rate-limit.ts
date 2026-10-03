import { getRedisClient } from '@anchorpipe/redis';

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit using Redis sorted sets (sliding window algorithm)
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `${config.keyPrefix || 'ratelimit'}:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline returned null');
    }

    const countResult = results[2];
    const count = Array.isArray(countResult) ? (countResult[1] as number) : 0;
    if (count > config.maxRequests) {
      const oldestEntries = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestEntries[1] ? parseInt(oldestEntries[1], 10) : now;
      const resetTime = oldestTimestamp + config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error('[Rate Limit] Redis error, allowing request:', error);
  }
}

/**
 * Get rate limit info for response headers
 */
export async function getRateLimitInfo(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `${config.keyPrefix || 'ratelimit'}:${key}`;

  try {
    await redis.zremrangebyscore(redisKey, 0, windowStart);
    const count = await redis.zcard(redisKey);
    const remaining = Math.max(0, config.maxRequests - count);
    const oldestEntries = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const reset = oldestEntries[1]
      ? parseInt(oldestEntries[1], 10) + config.windowMs
      : now + config.windowMs;

    return { limit: config.maxRequests, remaining, reset };
  } catch (error) {
    console.error('[Rate Limit] Error getting rate limit info:', error);
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: now + config.windowMs,
    };
  }
}

/**
 * Reset rate limit (for testing/admin)
 */
export async function resetRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  const redis = getRedisClient();
  const redisKey = `${config.keyPrefix || 'ratelimit'}:${key}`;
  try {
    await redis.del(redisKey);
  } catch (error) {
    console.error('[Rate Limit] Error resetting:', error);
  }
}
