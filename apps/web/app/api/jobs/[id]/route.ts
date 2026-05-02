import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/server";
import { hydrateGeneratedOutputFromGmi } from "@/lib/gmi";
import type { GeneratedOutput } from "@/lib/job-types";
import { getUserJob, updateJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const profile = await requireUserProfile();
  let job = await getUserJob(id, profile.id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const outputs = Array.isArray(job.result?.outputs) ? (job.result.outputs as GeneratedOutput[]) : [];
  const missingPreview = outputs.some((output) => output.gmiTaskId && !output.url);

  if (missingPreview) {
    const hydratedOutputs = await Promise.all(outputs.map((output) => hydrateGeneratedOutputFromGmi(output)));
    const changed = hydratedOutputs.some((output, index) => output.url !== outputs[index]?.url);

    if (changed) {
      const updatedJob = await updateJob(job.id, { outputs: hydratedOutputs });
      return NextResponse.json(updatedJob);
    } else {
      const fallbackJob = {
        ...job,
        result: {
          ...(typeof job.result === 'object' && job.result ? job.result : {}),
          outputs: hydratedOutputs
        }
      };
      return NextResponse.json(fallbackJob);
    }
  }

  return NextResponse.json(job);
}
