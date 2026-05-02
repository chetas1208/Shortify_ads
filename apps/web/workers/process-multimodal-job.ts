import { generateVideoVariantsWithGmi, interpretMultimodalIntent } from "@/lib/gmi";
import { getUserMemory, writeMemory } from "@/lib/hydradb";
import { setJobProgress } from "@/lib/job-progress";
import type { JobRecord } from "@/lib/job-types";
import { updateJob } from "@/lib/jobs";
import { createPresignedGet } from "@/lib/r2";

export async function processMultimodalJob(job: JobRecord) {
  const videos = job.input.assets?.filter((asset) => asset.type === "video") ?? [];
  const images = job.input.assets?.filter((asset) => asset.type === "image") ?? [];
  const sourceReference = job.input.sourceUrl ? `\nReference video URL: ${job.input.sourceUrl}` : "";

  await setJobProgress({
    jobId: job.id,
    status: "running",
    stage: "analyzing",
    progress: 22,
    message: "Reading text and media references"
  });
  await updateJob(job.id, { stage: "analyzing", progress: 22 });

  const memory = await getUserMemory(job.userId, job.input.text);
  const plan = await interpretMultimodalIntent({
    text: `${job.input.text ?? ""}${sourceReference}`.trim(),
    videos,
    images,
    memory
  });

  await setJobProgress({
    jobId: job.id,
    status: "running",
    stage: "generating",
    progress: 62,
    message: "Generating guided reel"
  });
  await updateJob(job.id, { stage: "generating", progress: 62, plan });

  const image = images.find((asset) => asset.r2Key);
  const imageUrl = image?.r2Key ? await createPresignedGet(image.r2Key) : undefined;

  await setJobProgress({
    jobId: job.id,
    status: "running",
    stage: "stitching",
    progress: 84,
    message: "Packaging the final reel"
  });
  await updateJob(job.id, { stage: "stitching", progress: 84 });

  const outputs = await generateVideoVariantsWithGmi({
    mode: "text_to_video",
    imageUrl,
    prompt: `${plan.editIntent}\nStyle: ${plan.stylePrompt}${sourceReference}`,
    title: "Guided 30s reel",
    platform: job.input.platform,
    count: 2
  });

  await writeMemory({
    userId: job.userId,
    namespace: "iteration_memory",
    text: `${plan.editIntent}\n${plan.stylePrompt}`,
    metadata: { jobId: job.id, mode: job.kind, outputIds: outputs.map((output) => output.id) }
  });

  await setJobProgress({
    jobId: job.id,
    status: "completed",
    stage: "completed",
    progress: 100,
    message: "Guided reels are ready"
  });

  return updateJob(job.id, {
    stage: "completed",
    status: "completed",
    progress: 100,
    outputs,
    error: null,
    completedAt: new Date().toISOString()
  });
}
