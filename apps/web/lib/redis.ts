import Redis from "ioredis";
import { env } from "@/lib/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis() {
  if (!env.REDIS_URL) {
    return undefined;
  }

  globalForRedis.redis ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: false
  });

  return globalForRedis.redis;
}

export function redisKey(...parts: string[]) {
  return [env.REDIS_KEY_PREFIX, ...parts].join(":");
}
