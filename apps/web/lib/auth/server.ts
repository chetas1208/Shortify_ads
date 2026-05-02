import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getPrisma } from "@/db/prisma";
import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars are not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot always set cookies; middleware refreshes the session.
        }
      }
    }
  });
}

export async function getCurrentSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentSupabaseUser();
  if (!user) {
    return null;
  }

  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL is required for dashboard profile records");
  }

  const profile = await prisma.userProfile.upsert({
    where: { supabaseUserId: user.id },
    update: {
      email: user.email ?? null,
      displayName: (user.user_metadata?.name as string | undefined) ?? undefined
    },
    create: {
      supabaseUserId: user.id,
      email: user.email ?? null,
      displayName: (user.user_metadata?.name as string | undefined) ?? null,
      hydraSubTenantId: `pending_${randomUUID()}`
    }
  });

  if (profile.hydraSubTenantId.startsWith("pending_")) {
    return prisma.userProfile.update({
      where: { id: profile.id },
      data: { hydraSubTenantId: `hydra_user_${profile.id}` }
    });
  }

  return profile;
}

export async function requireUserProfile() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  return profile;
}
