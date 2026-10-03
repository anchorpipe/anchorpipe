import { getRedisClient } from './lib/redis';

export interface AtomicLockResult {
  acquired: boolean;
  lockId?: string;
}

/**
 * Acquire an atomic lock in Redis using SET key value NX PX.
 */
export async function acquireAtomicLock(
  key: string,
  ttlMs = 10000
): Promise<AtomicLockResult> {
  try {
    const redis = getRedisClient();
    const lockId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const result = await redis.set(`lock:${key}`, lockId, 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return { acquired: true, lockId };
    }
    return { acquired: false };
  } catch (error) {
    console.error('[Redis] acquireAtomicLock failed', error);
    return { acquired: false };
  }
}

/**
 * Release an atomic lock safely using Lua script to check lockId ownership.
 */
export async function releaseAtomicLock(key: string, lockId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redis.eval(luaScript, 1, `lock:${key}`, lockId);
    return result === 1;
  } catch (error) {
    console.error('[Redis] releaseAtomicLock failed', error);
    return false;
  }
}

/**
 * Check and set replay protection nonce to prevent duplicate requests across instances.
 */
export async function checkAndSetNonce(
  tenantId: string,
  nonce: string,
  ttlSeconds = 86400
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = `nonce:${tenantId}:${nonce}`;
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('[Redis] checkAndSetNonce failed', error);
    // Fail-open or fallback logic depending on caller
    return true;
  }
}

export * from './lib/redis';
