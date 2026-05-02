import { NextRequest, NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/server";
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

  return NextResponse.json(job);
}
