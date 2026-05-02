import { requireEnv } from "@/lib/env";
import { gmi } from "@/lib/ai/provider";

export const modelIds = {
  kimi: () => requireEnv("GMI_KIMI_MODEL_ID"),
  nemotron: () => requireEnv("GMI_NEMOTRON_MODEL_ID"),
  glm5: () => requireEnv("GMI_GLM5_MODEL_ID"),
  pixverse56: () => requireEnv("GMI_PIXVERSE_5_6_MODEL_ID")
};

export const models = {
  kimi: () => gmi.chatModel(modelIds.kimi()),
  nemotron: () => gmi.chatModel(modelIds.nemotron()),
  glm5: () => gmi.chatModel(modelIds.glm5())
};
