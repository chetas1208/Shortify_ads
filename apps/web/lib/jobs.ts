import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/db/prisma";
import type { GeneratedOutput, JobInput, JobKind, JobRecord, JobStage, JobStatus } from "./job-types";

type JobPatch = Partial<{
  stage: JobStage;
  status: JobStatus;
  progress: number;
  plan: Record<string, unknown>;
  result: Record<string, unknown>;
  outputs: GeneratedOutput[];
  error: string | null;
  attempts: number;
  nextRunAt: string;
  startedAt: string | null;
  completedAt: string | null;
}>;

function toJson(value: unknown): any {
  return value as any;
}

function fromDb(job: {
  id: string;
  userId: string;
  threadId: string | null;
  kind: string;
  stage: string;
  status: string;
  progress: number;
  input: unknown;
  plan: unknown;
  result: unknown;
  error: string | null;
  attempts: number;
  nextRunAt: Date;
  startedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): JobRecord {
  return {
    id: job.id,
    userId: job.userId,
    threadId: job.threadId ?? undefined,
    kind: job.kind as JobKind,
    stage: job.stage as JobStage,
    status: job.status as JobStatus,
    progress: job.progress,
    input: job.input as JobInput,
    plan: job.plan as Record<string, unknown>,
    result: job.result as JobRecord["result"],
    error: job.error ?? undefined,
    attempts: job.attempts,
    nextRunAt: job.nextRunAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString()
  };
}

export async function createJob(input: {
  userId: string;
  threadId?: string;
  kind: JobKind;
  payload: JobInput;
}): Promise<JobRecord> {
  const now = new Date();
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL is required to create jobs");
  }

  const created = await prisma.job.create({
    data: {
      userId: input.userId,
      threadId: input.threadId,
      kind: input.kind,
      stage: "received",
      status: "queued",
      progress: 0,
      input: toJson(input.payload),
      plan: toJson({}),
      result: toJson({ outputs: [] }),
      attempts: 0,
      nextRunAt: now
    }
  });

  return fromDb(created);
}

export async function listJobs(limit = 50, userId?: string): Promise<JobRecord[]> {
  const prisma = getPrisma();
  if (!prisma) {
    return [];
  }

  const jobs = await prisma.job.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return jobs.map(fromDb);
}

export async function getJob(id: string): Promise<JobRecord | undefined> {
  const prisma = getPrisma();
  if (!prisma) {
    return undefined;
  }

  const job = await prisma.job.findUnique({ where: { id } });
  return job ? fromDb(job) : undefined;
}

export async function getUserJob(id: string, userId: string): Promise<JobRecord | undefined> {
  const prisma = getPrisma();
  if (!prisma) {
    return undefined;
  }

  const job = await prisma.job.findFirst({ where: { id, userId } });
  return job ? fromDb(job) : undefined;
}

export async function claimNextJob(): Promise<JobRecord | undefined> {
  const prisma = getPrisma();
  if (!prisma) {
    return undefined;
  }

  const job = await prisma.job.findFirst({
    where: {
      status: "queued",
      nextRunAt: { lte: new Date() }
    },
    orderBy: { createdAt: "asc" }
  });

  if (!job) {
    return undefined;
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "running",
      attempts: { increment: 1 },
      startedAt: new Date()
    }
  });

  return fromDb(updated);
}

export async function updateJob(id: string, patch: JobPatch): Promise<JobRecord> {
  const prisma = getPrisma();
  const now = new Date();

  if (!prisma) {
    throw new Error("DATABASE_URL is required to update jobs");
  }

  const current = await prisma.job.findUnique({ where: { id } });
  if (!current) {
    throw new Error(`Job not found: ${id}`);
  }

  const currentResult = current.result as Record<string, unknown>;
  const nextResult = patch.outputs
    ? { ...currentResult, outputs: patch.outputs }
    : patch.result
      ? { ...currentResult, ...patch.result }
      : undefined;

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(patch.stage ? { stage: patch.stage } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.plan ? { plan: toJson(patch.plan) } : {}),
      ...(nextResult ? { result: toJson(nextResult) } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      ...(patch.attempts !== undefined ? { attempts: patch.attempts } : {}),
      ...(patch.nextRunAt ? { nextRunAt: new Date(patch.nextRunAt) } : {}),
      ...(patch.startedAt !== undefined
        ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
        : {}),
      ...(patch.completedAt !== undefined
        ? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
        : {})
    }
  });

  return fromDb(updated);
}
