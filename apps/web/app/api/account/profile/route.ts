import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/db/prisma";
import { requireUserProfile } from "@/lib/auth/server";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET() {
  const profile = await requireUserProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const profile = await requireUserProfile();
  const body = profileUpdateSchema.parse(await request.json());
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      displayName: body.displayName,
      ...(body.settings ? { settings: body.settings as any } : {})
    }
  });

  return NextResponse.json({ profile: updated });
}
