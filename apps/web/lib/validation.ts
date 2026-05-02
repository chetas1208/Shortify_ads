import { z } from "zod";
import { jobKinds, outputPlatforms } from "@/lib/job-types";

export const jobCreateSchema = z.object({
  mode: z.enum(jobKinds),
  threadId: z.string().optional(),
  text: z.string().trim().max(4000).optional(),
  youtubeUrl: z.string().trim().url().optional(),
  assetIds: z.array(z.string()).max(8).default([]),
  platform: z.enum(outputPlatforms).default("youtube_shorts")
});

export const uploadPresignSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
  bytes: z.number().int().positive()
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  settings: z.record(z.string(), z.unknown()).optional()
});
