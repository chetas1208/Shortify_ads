import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@/lib/env";

export const gmi = createOpenAICompatible({
  name: "gmi",
  apiKey: env.GMI_API_KEY,
  baseURL: env.GMI_API_BASE_URL,
  includeUsage: true,
  headers: env.GMI_ORG_ID ? { "X-Organization-ID": env.GMI_ORG_ID } : undefined
});
