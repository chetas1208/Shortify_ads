import { NextResponse } from "next/server";
import { getPrisma } from "@/db/prisma";
import { requireUserProfile } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { buildR2Key, createPresignedPut, mediaExpiresAt } from "@/lib/r2";
import { uploadPresignSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const profile = await requireUserProfile();
  const body = uploadPresignSchema.parse(await request.json());
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const maxUploadMb = Math.min(env.MAX_UPLOAD_MB, 100);
  if (body.bytes > maxUploadMb * 1024 * 1024) {
    return NextResponse.json({ error: `Uploads must be ${maxUploadMb} MB or less` }, { status: 400 });
  }

  if (!body.mimeType.startsWith("video/") && !body.mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only video and image uploads are supported" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: {
      userId: profile.id,
      kind: body.mimeType.startsWith("image/") ? "reference" : "upload",
      mimeType: body.mimeType,
      fileName: body.fileName,
      bytes: body.bytes,
      r2Key: "pending",
      expiresAt: mediaExpiresAt()
    }
  });

  const r2Key = buildR2Key({
    userId: profile.id,
    assetId: asset.id,
    kind: "uploads",
    fileName: body.fileName
  });
  await prisma.asset.update({ where: { id: asset.id }, data: { r2Key } });

  return NextResponse.json({
    assetId: asset.id,
    r2Key,
    uploadUrl: await createPresignedPut({ key: r2Key, mimeType: body.mimeType }),
    expiresAt: asset.expiresAt.toISOString()
  });
}
