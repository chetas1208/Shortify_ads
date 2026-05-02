import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/server";
import { getJobProgress } from "@/lib/job-progress";
import { getUserJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const profile = await requireUserProfile();
  const job = await getUserJob(id, profile.id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const progress = await getJobProgress(id);
  return NextResponse.json({
    jobId: id,
    status: progress?.status ?? job.status,
    stage: progress?.stage ?? job.stage,
    progress: progress?.progress ?? job.progress,
    message: progress?.message,
    updatedAt: progress?.updatedAt ?? job.updatedAt
  });
}
