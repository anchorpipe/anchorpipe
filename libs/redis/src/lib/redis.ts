import Redis from 'ioredis';

let redisClient: Redis | null = null;

const commonOptions = {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  reconnectOnError: (err: Error) => err.message.includes('READONLY'),
};

export function createRedisClient(): Redis {
  if (redisClient) return redisClient;

  const redisUrl = process.env['REDIS_URL'];
  if (redisUrl) {
    redisClient = new Redis(redisUrl, commonOptions);
  } else {
    redisClient = new Redis({
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0', 10),
      ...commonOptions,
    });
  }

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
  redisClient.on('ready', () => console.log('Redis Client Ready'));

  return redisClient;
}

export function getRedisClient(): Redis {
  return redisClient || createRedisClient();
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export { Redis };
