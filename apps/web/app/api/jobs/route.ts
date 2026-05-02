import { NextResponse } from "next/server";
import { getPrisma } from "@/db/prisma";
import { requireUserProfile } from "@/lib/auth/server";
import { enqueueJob } from "@/lib/job-queue";
import { setJobProgress } from "@/lib/job-progress";
import { createJob, listJobs } from "@/lib/jobs";
import { jobCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function titleFromText(text?: string) {
  const trimmed = text?.trim();
  if (!trimmed) {
    return "Untitled generation";
  }

  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function hasVideoAsset(assets: Array<{ mimeType?: string | null }>) {
  return assets.some((asset) => asset.mimeType?.startsWith("video/"));
}

function hasImageAsset(assets: Array<{ mimeType?: string | null }>) {
  return assets.some((asset) => asset.mimeType?.startsWith("image/"));
}

function extractYouTubeUrl(text?: string) {
  const match = text?.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+/i);
  return match?.[0];
}

export async function GET() {
  const profile = await requireUserProfile();
  const jobs = await listJobs(50, profile.id);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const profile = await requireUserProfile();
  const body = jobCreateSchema.parse(await request.json());
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  if (!body.text && body.assetIds.length === 0) {
    return NextResponse.json({ error: "Send text, media, or both to create a job" }, { status: 400 });
  }

  const assets = body.assetIds.length
    ? await prisma.asset.findMany({
        where: {
          id: { in: body.assetIds },
          userId: profile.id,
          deletedAt: null
        }
      })
    : [];

  if (assets.length !== body.assetIds.length) {
    return NextResponse.json({ error: "One or more assets were not found" }, { status: 400 });
  }

  const youtubeUrl = body.youtubeUrl ?? extractYouTubeUrl(body.text);
  const text = body.text?.trim() || undefined;

  if (body.mode === "text_to_video" && !text) {
    return NextResponse.json({ error: "Text to video requires a prompt" }, { status: 400 });
  }

  if (body.mode === "video_to_shorts" && !youtubeUrl && !hasVideoAsset(assets)) {
    return NextResponse.json({ error: "Long video analysis requires a video upload or YouTube link" }, { status: 400 });
  }

  if (body.mode === "multimodal_edit") {
    if (!text) {
      return NextResponse.json({ error: "Multimodal generation requires text guidance" }, { status: 400 });
    }

    if (!youtubeUrl && !hasVideoAsset(assets) && !hasImageAsset(assets)) {
      return NextResponse.json({ error: "Multimodal generation requires at least one image, video, or YouTube link" }, { status: 400 });
    }
  }

  const thread =
    body.threadId
      ? await prisma.chatThread.findFirst({ where: { id: body.threadId, userId: profile.id } })
      : await prisma.chatThread.create({
          data: {
            userId: profile.id,
            title: titleFromText(text ?? youtubeUrl),
            mode: body.mode
          }
        });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      userId: profile.id,
      role: "user",
      content: text ?? youtubeUrl ?? null,
      metadata: {
        assetIds: body.assetIds,
        mode: body.mode,
        platform: body.platform,
        youtubeUrl
      }
    }
  });

  const job = await createJob({
    userId: profile.id,
    threadId: thread.id,
    kind: body.mode,
    payload: {
      text,
      youtubeUrl,
      assetIds: body.assetIds,
      assets: assets.map((asset) => ({
        id: asset.id,
        kind: asset.kind,
        type: asset.mimeType?.startsWith("image/") ? "image" : "video",
        r2Key: asset.r2Key,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        bytes: asset.bytes,
        expiresAt: asset.expiresAt.toISOString(),
        metadata: asset.metadata as Record<string, unknown>
      })),
      sourceUrl: youtubeUrl,
      platform: body.platform
    }
  });

  if (assets.length > 0) {
    await prisma.asset.updateMany({
      where: { id: { in: body.assetIds }, userId: profile.id },
      data: { jobId: job.id }
    });
  }

  await setJobProgress({
    jobId: job.id,
    status: "queued",
    stage: "received",
    progress: 3,
    message: "Job received and queued"
  });
  await enqueueJob(job.id);

  return NextResponse.json({ job, threadId: thread.id }, { status: 201 });
}
