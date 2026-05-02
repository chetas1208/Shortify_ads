import { HydraDBClient } from "@hydra_db/node";
import { getPrisma } from "@/db/prisma";
import { env, requireEnv } from "@/lib/env";
import type { ContextExtractionResult, GeneratedOutput, UserMemory } from "@/lib/job-types";
import { logger } from "@/lib/logger";
import { withRetry } from "@/lib/retry";

const globalForHydraDb = globalThis as unknown as {
  hydraDbClient?: HydraDBClient;
};

function getHydraDbClient() {
  globalForHydraDb.hydraDbClient ??= new HydraDBClient({
    token: requireEnv("HYDRADB_API_KEY")
  });

  return globalForHydraDb.hydraDbClient;
}

async function resolveSubTenantId(userId: string) {
  const prisma = getPrisma();
  if (!prisma) {
    return `hydra_user_${userId}`;
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  return profile?.hydraSubTenantId ?? `hydra_user_${userId}`;
}

function buildMemoryMetadata(namespace: string, metadata?: Record<string, unknown>) {
  const payload = {
    namespace,
    ...(metadata ?? {})
  };

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
}

async function recallUserMemory(input: {
  query: string;
  subTenantId: string;
}) {
  return withRetry("hydradb.recallPreferences", async () => {
    return getHydraDbClient().recall.recallPreferences(
      {
        tenant_id: requireEnv("HYDRADB_TENANT_ID"),
        sub_tenant_id: input.subTenantId,
        query: input.query,
        max_results: 8,
        mode: "fast",
        alpha: 0.8,
        recency_bias: 0
      },
      {
        timeoutInSeconds: 30,
        maxRetries: 1
      }
    );
  });
}

async function addUserMemory(input: {
  subTenantId: string;
  namespace: string;
  text: string;
  metadata?: Record<string, unknown>;
}) {
  return withRetry("hydradb.addMemory", async () => {
    return getHydraDbClient().upload.addMemory(
      {
        tenant_id: requireEnv("HYDRADB_TENANT_ID"),
        sub_tenant_id: input.subTenantId,
        upsert: true,
        memories: [
          {
            text: input.text,
            infer: false,
            title: input.namespace,
            document_metadata: buildMemoryMetadata(input.namespace, input.metadata)
          }
        ]
      },
      {
        timeoutInSeconds: 30,
        maxRetries: 1
      }
    );
  });
}

export async function getUserMemory(userId: string, query = "video style preferences"): Promise<UserMemory> {
  if (!env.HYDRADB_API_KEY || !env.HYDRADB_TENANT_ID) {
    return { userId };
  }

  const subTenantId = await resolveSubTenantId(userId);
  const raw = await recallUserMemory({
    subTenantId,
    query
  }).catch((error) => {
    logger.warn("HydraDB recall failed; continuing without semantic memory", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    return undefined;
  });

  return { userId, raw };
}

export async function writeMemory(input: {
  userId: string;
  namespace: string;
  text: string;
  metadata?: Record<string, unknown>;
}) {
  if (!env.HYDRADB_API_KEY || !env.HYDRADB_TENANT_ID) {
    return;
  }

  const subTenantId = await resolveSubTenantId(input.userId);
  await addUserMemory({
    subTenantId,
    namespace: input.namespace,
    text: input.text,
    metadata: input.metadata
  }).catch((error) => {
    logger.warn("HydraDB memory write failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: input.userId
    });
  });
}

export async function saveUserPreference(input: {
  userId: string;
  outputs?: GeneratedOutput[];
  style?: string;
  durationSeconds?: number;
  captionTone?: string;
}) {
  await writeMemory({
    userId: input.userId,
    namespace: "user_preferences",
    text: JSON.stringify({
      style: input.style,
      durationSeconds: input.durationSeconds,
      captionTone: input.captionTone,
      acceptedOutputs: input.outputs?.map((output) => output.title)
    }),
    metadata: { kind: "preference" }
  });
}

export async function storeProcessedVideoMemory(input: {
  userId: string;
  jobId: string;
  originalVideoUrl?: string;
  r2Key: string;
  tempChunkKeys: string[];
  aggregateSummary: string;
  chunkSummaries: ContextExtractionResult[];
  sourceType: string;
}) {
  await writeMemory({
    userId: input.userId,
    namespace: "source_context",
    text: input.aggregateSummary,
    metadata: {
      jobId: input.jobId,
      sourceType: input.sourceType,
      originalVideoUrl: input.originalVideoUrl,
      r2Key: input.r2Key,
      tempChunkKeys: input.tempChunkKeys,
      chunkCount: input.chunkSummaries.length
    }
  });
}
