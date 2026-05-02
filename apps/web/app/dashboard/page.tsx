import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireUserProfile } from "@/lib/auth/server";
import { listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireUserProfile();
  const jobs = await listJobs(50, profile.id);
  return <DashboardClient email={profile.email} initialJobs={jobs} />;
}
