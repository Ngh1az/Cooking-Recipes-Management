import { createClient, type RedisClientType } from "redis";

const globalRedis = globalThis as typeof globalThis & {
  __recipeMgRedisClient__?: RedisClientType;
  __recipeMgRedisConnectPromise__?: Promise<RedisClientType>;
};

function getRedisUrl() {
  return process.env.REDIS_URL?.trim() || null;
}

export async function getRedisClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  if (!globalRedis.__recipeMgRedisClient__) {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 10000),
      },
    });

    client.on("error", (error) => {
      console.error("[Redis] Client error", error);
    });

    globalRedis.__recipeMgRedisClient__ = client;
  }

  const client = globalRedis.__recipeMgRedisClient__;

  if (!client.isOpen) {
    if (!globalRedis.__recipeMgRedisConnectPromise__) {
      globalRedis.__recipeMgRedisConnectPromise__ = client
        .connect()
        .then(() => client)
        .finally(() => {
          globalRedis.__recipeMgRedisConnectPromise__ = undefined;
        });
    }

    await globalRedis.__recipeMgRedisConnectPromise__;
  }

  return client;
}
