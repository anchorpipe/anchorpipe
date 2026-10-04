import { ReplayStore } from './hmac';
import { checkAndSetNonce } from '@anchorpipe/redis';

/**
 * Redis-backed atomic replay store with DB/in-memory fallback.
 * Prevents duplicate HMAC signature nonces across distributed server instances.
 */
export class DistributedRedisReplayStore implements ReplayStore {
  async consume(nonce: string, expiresAtMilliseconds: number): Promise<boolean> {
    const ttlSeconds = Math.max(
      1,
      Math.ceil((expiresAtMilliseconds - Date.now()) / 1000)
    );
    // Uses atomic SET key value EX ttl NX in Redis
    return await checkAndSetNonce('global', nonce, ttlSeconds);
  }
}

export const defaultDistributedReplayStore = new DistributedRedisReplayStore();
