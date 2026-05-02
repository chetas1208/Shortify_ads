import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().default("replace_me"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_KEY_PREFIX: z.string().default("matcha:mvp"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_AUTH_REDIRECT_PATH: z.string().default("/auth/callback"),
  GMI_API_BASE_URL: z.string().url().default("https://api.gmi-serving.com/v1"),
  GMI_API_KEY: z.string().optional(),
  GMI_ORG_ID: z.string().optional(),
  GMI_KIMI_MODEL_ID: z.string().optional(),
  GMI_NEMOTRON_MODEL_ID: z.string().optional(),
  GMI_GLM5_MODEL_ID: z.string().optional(),
  GMI_PIXVERSE_5_6_MODEL_ID: z.string().optional(),
  GMI_PIXVERSE_API_URL: z.string().url().default(
    "https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests"
  ),
  GMI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(120000),
  HYDRADB_API_KEY: z.string().optional(),
  HYDRADB_TENANT_ID: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  R2_PRESIGNED_PUT_TTL_SECONDS: z.coerce.number().positive().default(900),
  R2_PRESIGNED_GET_TTL_SECONDS: z.coerce.number().positive().default(900),
  R2_MEDIA_RETENTION_MINUTES: z.coerce.number().positive().default(15),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(100),
  MAX_VIDEO_PREPROCESS_MB: z.coerce.number().positive().default(20),
  MAX_VIDEO_SECONDS_BEFORE_CHUNKING: z.coerce.number().positive().default(30),
  TARGET_CHUNK_SECONDS: z.coerce.number().positive().default(30),
  FFMPEG_CRF_DEFAULT: z.coerce.number().positive().default(23),
  FFMPEG_CRF_RETRY: z.coerce.number().positive().default(26),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().positive().default(1000),
  JOB_MAX_ATTEMPTS: z.coerce.number().positive().default(2),
  JOB_STALE_LOCK_SECONDS: z.coerce.number().positive().default(300),
  YOUTUBE_COOKIES_PATH: z.string().optional(),
  ENABLE_DEMO_MODE: z.coerce.boolean().default(false),
  DEMO_USER_EMAIL: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  LOG_PRETTY: z.coerce.boolean().default(true)
});

export const env = envSchema.parse(process.env);

export function requireEnv<K extends keyof typeof env>(
  name: K
): NonNullable<(typeof env)[K]> {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value as NonNullable<(typeof env)[K]>;
}
