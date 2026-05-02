import { generateVideoVariantsWithGmi, refinePrompt } from "@/lib/gmi";
import { getUserMemory, saveUserPreference, writeMemory } from "@/lib/hydradb";
import { setJobProgress } from "@/lib/job-progress";
import type { JobRecord } from "@/lib/job-types";
import { updateJob } from "@/lib/jobs";

export async function processTextJob(job: JobRecord) {
  await setJobProgress({
    jobId: job.id,
    status: "running",
    stage: "ranking",
    progress: 25,
    message: "Refining prompt with Kimi"
  });
  await updateJob(job.id, { stage: "ranking", progress: 25 });

  const memory = await getUserMemory(job.userId, job.input.text);
  const refined = await refinePrompt(job.input.text ?? "", memory);

  await writeMemory({
    userId: job.userId,
    namespace: "input_summaries",
    text: refined.prompt,
    metadata: { jobId: job.id, mode: job.kind }
  });

  await setJobProgress({
    jobId: job.id,
    status: "running",
    stage: "generating",
    progress: 60,
    message: "Generating video through GMI PixVerse model"
  });
  await updateJob(job.id, { stage: "generating", progress: 60, plan: refined });

  const outputs = await generateVideoVariantsWithGmi({
    mode: "text_to_video",
    prompt: refined.prompt,
    title: refined.title,
    platform: job.input.platform,
    count: 2
  });

  await saveUserPreference({
    userId: job.userId,
    outputs,
    captionTone: memory.captionTone
  });

  await setJobProgress({
    jobId: job.id,
    status: "completed",
    stage: "completed",
    progress: 100,
    message: "Two video results are ready"
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
