import { env } from "@/lib/env";
import { getRedis, redisKey } from "@/lib/redis";

export async function enqueueJob(jobId: string) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.rpush(redisKey("queue", "jobs"), jobId);
}

export async function dequeueJobId() {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }

  return (await redis.lpop(redisKey("queue", "jobs"))) ?? undefined;
}

export async function acquireJobLock(jobId: string, workerId: string) {
  const redis = getRedis();
  if (!redis) {
    return true;
  }

  const result = await redis.set(
    redisKey("job", jobId, "lock"),
    workerId,
    "EX",
    env.JOB_STALE_LOCK_SECONDS,
    "NX"
  );

  return result === "OK";
}

export async function releaseJobLock(jobId: string) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.del(redisKey("job", jobId, "lock"));
}

export async function scheduleR2Cleanup(key: string, deleteAt: Date) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.zadd(redisKey("cleanup", "r2"), deleteAt.getTime(), key);
}

export async function popDueR2CleanupKeys(limit = 50) {
  const redis = getRedis();
  if (!redis) {
    return [];
  }

  const cleanupKey = redisKey("cleanup", "r2");
  const keys = await redis.zrangebyscore(cleanupKey, 0, Date.now(), "LIMIT", 0, limit);
  if (keys.length > 0) {
    await redis.zrem(cleanupKey, ...keys);
  }

  return keys;
}
