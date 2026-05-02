import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/db/prisma";
import { requireUserProfile } from "@/lib/auth/server";
import { createPresignedGet } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const profile = await requireUserProfile();
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const asset = await prisma.asset.findFirst({
    where: {
      id,
      userId: profile.id,
      deletedAt: null
    }
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (asset.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This temporary media file has expired" }, { status: 410 });
  }

  return NextResponse.json({
    url: await createPresignedGet(asset.r2Key),
    expiresAt: asset.expiresAt.toISOString()
  });
}
