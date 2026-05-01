import IORedis from 'ioredis';
import { env } from '../env';

let _connection: IORedis | null = null;

/**
 * Returns a singleton IORedis connection for BullMQ.
 *
 * BullMQ requires maxRetriesPerRequest: null — any other value causes
 * the queue to throw on blocked commands (BRPOP, BLPOP, etc.).
 *
 * Upstash Redis requires TLS (rediss:// scheme). The connection
 * automatically detects TLS from the URL scheme.
 */
export function getRedisConnection(): IORedis {
  if (_connection) return _connection;

  const redisUrl = new URL(env.REDIS_URL);
  const isTls = env.REDIS_URL.startsWith('rediss://');

  _connection = new IORedis({
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || (isTls ? '6380' : '6379'), 10),
    password: redisUrl.password || undefined,
    username: redisUrl.username || undefined,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    lazyConnect: true,
  });

  _connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  return _connection;
}
