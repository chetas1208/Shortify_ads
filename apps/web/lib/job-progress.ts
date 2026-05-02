import type { JobProgress, JobStage, JobStatus } from "@/lib/job-types";
import { getRedis, redisKey } from "@/lib/redis";

export async function setJobProgress(input: {
  jobId: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  message?: string;
}) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const updatedAt = new Date().toISOString();
  const progress: JobProgress = { ...input, updatedAt };
  const stateKey = redisKey("job", input.jobId, "state");
  const eventsKey = redisKey("job", input.jobId, "events");

  await redis
    .multi()
    .hset(stateKey, {
      status: input.status,
      stage: input.stage,
      progress: String(input.progress),
      message: input.message ?? "",
      updatedAt
    })
    .expire(stateKey, 60 * 60)
    .lpush(eventsKey, JSON.stringify(progress))
    .ltrim(eventsKey, 0, 24)
    .expire(eventsKey, 60 * 60)
    .exec();
}

export async function getJobProgress(jobId: string): Promise<JobProgress | undefined> {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }

  const value = await redis.hgetall(redisKey("job", jobId, "state"));
  if (!value.status || !value.stage || !value.updatedAt) {
    return undefined;
  }

  return {
    jobId,
    status: value.status as JobStatus,
    stage: value.stage as JobStage,
    progress: Number(value.progress ?? 0),
    message: value.message || undefined,
    updatedAt: value.updatedAt
  };
}
