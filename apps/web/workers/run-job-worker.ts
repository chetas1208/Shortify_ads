import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { dequeueJobId, acquireJobLock, releaseJobLock, popDueR2CleanupKeys } from "@/lib/job-queue";
import { setJobProgress } from "@/lib/job-progress";
import { getJob, claimNextJob, updateJob } from "@/lib/jobs";
import { logger } from "@/lib/logger";
import { deleteR2Objects } from "@/lib/r2";
import { processMultimodalJob } from "./process-multimodal-job";
import { processTextJob } from "./process-text-job";
import { processVideoJob } from "./process-video-job";

const workerId = `worker_${randomUUID()}`;

async function claimJob() {
  const queuedId = await dequeueJobId();
  if (queuedId) {
    const job = await getJob(queuedId);
    if (job?.status === "queued") {
      await updateJob(job.id, {
        status: "running",
        startedAt: new Date().toISOString(),
        attempts: job.attempts + 1
      });
      return getJob(job.id);
    }
  }

  return claimNextJob();
}

async function processClaimedJob() {
  const job = await claimJob();
  if (!job) {
    return;
  }

  const locked = await acquireJobLock(job.id, workerId);
  if (!locked) {
    return;
  }

  logger.info("Processing job", { jobId: job.id, kind: job.kind, attempt: job.attempts, workerId });

  try {
    await setJobProgress({
      jobId: job.id,
      status: "running",
      stage: job.stage,
      progress: Math.max(job.progress, 5),
      message: "Worker claimed job"
    });

    if (job.kind === "text_to_video") {
      await processTextJob(job);
    } else if (job.kind === "video_to_shorts") {
      await processVideoJob(job);
    } else {
      await processMultimodalJob(job);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Job failed", { jobId: job.id, error: message });

    if (job.attempts < env.JOB_MAX_ATTEMPTS) {
      await updateJob(job.id, {
        status: "queued",
        error: message,
        nextRunAt: new Date(Date.now() + (job.attempts + 1) * 5000).toISOString()
      });
      return;
    }

    await setJobProgress({
      jobId: job.id,
      status: "failed",
      stage: "failed",
      progress: job.progress,
      message
    });
    await updateJob(job.id, {
      stage: "failed",
      status: "failed",
      error: message,
      completedAt: new Date().toISOString()
    });
  } finally {
    await releaseJobLock(job.id);
  }
}

async function cleanupDueMedia() {
  const keys = await popDueR2CleanupKeys();
  if (keys.length === 0) {
    return;
  }

  await deleteR2Objects(keys);
  logger.info("Deleted expired R2 objects", { count: keys.length });
}

async function loop() {
  logger.info("Worker loop started", { workerId });

  for (;;) {
    await processClaimedJob();
    await cleanupDueMedia();
    await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_INTERVAL_MS));
  }
}

loop().catch((error) => {
  logger.error("Worker loop crashed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
