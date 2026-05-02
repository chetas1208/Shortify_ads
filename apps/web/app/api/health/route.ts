import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "matcha-ai-video-web",
    env: env.NODE_ENV,
    hasDatabase: Boolean(env.DATABASE_URL),
    hasRedis: Boolean(env.REDIS_URL),
    hasSupabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasGmi: Boolean(env.GMI_API_KEY),
    hasHydraDb: Boolean(env.HYDRADB_API_KEY && env.HYDRADB_TENANT_ID),
    hasR2: Boolean(env.R2_BUCKET && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID)
  });
}
