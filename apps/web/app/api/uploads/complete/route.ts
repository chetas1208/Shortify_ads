import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/db/prisma";
import { requireUserProfile } from "@/lib/auth/server";
import { scheduleR2Cleanup } from "@/lib/job-queue";

const completeSchema = z.object({
  assetId: z.string()
});

export async function POST(request: Request) {
  const profile = await requireUserProfile();
  const { assetId } = completeSchema.parse(await request.json());
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: profile.id } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await scheduleR2Cleanup(asset.r2Key, asset.expiresAt);
  return NextResponse.json({ asset });
}
