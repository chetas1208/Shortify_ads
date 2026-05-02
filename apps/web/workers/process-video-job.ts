import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "@/lib/env";
import { generateVideoWithGmi, rankShortMoments } from "@/lib/gmi";
import { getUserMemory, writeMemory } from "@/lib/hydradb";
import { setJobProgress } from "@/lib/job-progress";
import type { GeneratedOutput, JobRecord } from "@/lib/job-types";
import { updateJob } from "@/lib/jobs";
import { downloadYoutube } from "@/lib/ffmpeg";
import { cleanupTempMediaObjects, preprocessVideoForJob } from "@/lib/preprocess-video";
import { createPresignedGet } from "@/lib/r2";
import { localScoreCandidates } from "@/lib/scoring";

async function downloadR2Source(r2Key: string) {
  const workDir = "/tmp/matcha-shorts/uploads";
  await mkdir(workDir, { recursive: true });
  const path = join(workDir, `${randomUUID()}-source.mp4`);
  const response = await fetch(await createPresignedGet(r2Key));
  if (!response.ok) {
    throw new Error(`Unable to download R2 source: ${response.status}`);
  }

  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

export async function processVideoJob(job: JobRecord) {
  const source = job.input.assets?.find((asset) => asset.type === "video" && asset.r2Key);
  if (!source?.r2Key && !job.input.sourceUrl) {
    throw new Error("Video job requires an uploaded video asset or YouTube URL");
  }

  const tempStorageKeys: string[] = [];

  try {
    await setJobProgress({
      jobId: job.id,
      status: "running",
      stage: "preprocessing",
      progress: 18,
      message: "Inspecting and preprocessing source video"
    });
    await updateJob(job.id, { stage: "preprocessing", progress: 18 });

    const sourcePath = job.input.sourceUrl
      ? await downloadYoutube(job.input.sourceUrl, env.YOUTUBE_COOKIES_PATH)
      : await downloadR2Source(source?.r2Key as string);

    const processedVideo = await preprocessVideoForJob({
      jobId: job.id,
      sourcePath,
      sourceType: job.input.sourceUrl ? "youtube_url" : "upload",
      userId: job.userId
    });
    tempStorageKeys.push(...processedVideo.tempDerivedKeys, ...processedVideo.tempChunkKeys);

    await setJobProgress({
      jobId: job.id,
      status: "running",
      stage: "ranking",
      progress: 58,
      message: "Ranking the best short-form moments"
    });
    await updateJob(job.id, { stage: "ranking", progress: 58 });

    const memory = await getUserMemory(job.userId, processedVideo.aggregateSummary);
    const ranked = localScoreCandidates(
      await rankShortMoments({
        textIntent: job.input.text,
        assets: job.input.assets ?? [],
        scenes: processedVideo.chunkContexts.slice(0, 5).map((chunk) => ({
          id: randomUUID(),
          title: `Clip ${chunk.chunkIndex + 1}`,
          hook: chunk.summary,
          score: 90 - chunk.chunkIndex * 4,
          startSeconds: chunk.startSec,
          endSeconds: chunk.endSec,
          transcript: chunk.transcriptSummary
        })),
        memory
      })
    );

    await setJobProgress({
      jobId: job.id,
      status: "running",
      stage: "generating",
      progress: 78,
      message: "Preparing five ranked outputs"
    });
    await updateJob(job.id, { stage: "generating", progress: 78 });

    const outputs: GeneratedOutput[] = ranked.slice(0, 5).map((candidate) => ({
      id: randomUUID(),
      title: candidate.title,
      hook: candidate.hook,
      score: candidate.score,
      platform: job.input.platform,
      metadata: {
        aggregateSummary: processedVideo.aggregateSummary,
        startSeconds: candidate.startSeconds,
        endSeconds: candidate.endSeconds,
        sourceR2Key: source?.r2Key,
        sourceUrl: job.input.sourceUrl,
        tempChunkKeys: processedVideo.tempChunkKeys
      }
    }));

    if (outputs.length === 0) {
      outputs.push(
        await generateVideoWithGmi({
          mode: "text_to_video",
          prompt: `Create a short from this source: ${processedVideo.aggregateSummary}`,
          title: "AI short from source video",
          platform: job.input.platform
        })
      );
    }

    await writeMemory({
      userId: job.userId,
      namespace: "output_summaries",
      text: outputs.map((output) => `${output.title}: ${output.hook ?? ""}`).join("\n"),
      metadata: { jobId: job.id, mode: job.kind }
    });

    await setJobProgress({
      jobId: job.id,
      status: "completed",
      stage: "completed",
      progress: 100,
      message: "Short candidates are ready"
    });

    return updateJob(job.id, {
      stage: "completed",
      status: "completed",
      progress: 100,
      outputs,
      completedAt: new Date().toISOString()
    });
  } finally {
    if (tempStorageKeys.length > 0) {
      await cleanupTempMediaObjects(tempStorageKeys);
    }
  }
}
