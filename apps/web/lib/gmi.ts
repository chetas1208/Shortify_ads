import { env, requireEnv } from "./env";
import type { GeneratedOutput, MediaAsset, ShortCandidate, UserMemory } from "./job-types";
import { withRetry } from "./retry";
import { modelIds } from "@/lib/ai/models";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type PixverseRequestPayload = {
  prompt: string;
  negative_prompt: string;
  duration: string;
  aspect_ratio: string;
  quality: string;
  style: string;
  thinking_type: string;
  generate_audio_switch: boolean;
  generate_multi_clip_switch: boolean;
};

function buildPixversePayload(input: {
  prompt: string;
  mode: "text_to_video" | "image_to_video" | "video_stylize";
}) {
  if (input.mode !== "text_to_video") {
    throw new Error(
      `PixVerse request-queue integration is currently configured only for text_to_video, received ${input.mode}`
    );
  }

  const payload: PixverseRequestPayload = {
    prompt: input.prompt,
    negative_prompt: "blurry, low quality, distorted",
    duration: "5",
    aspect_ratio: "16:9",
    quality: "1080p",
    style: "none",
    thinking_type: "auto",
    generate_audio_switch: true,
    generate_multi_clip_switch: false
  };

  return payload;
}

async function gmiChat<T>(model: string, messages: ChatMessage[], fallback: T): Promise<T> {
  const apiKey = requireEnv("GMI_API_KEY");

  return withRetry("gmi.chat", async () => {
    const response = await fetch(`${env.GMI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(env.GMI_ORG_ID ? { "X-Organization-ID": env.GMI_ORG_ID } : {})
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`GMI request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    return JSON.parse(content) as T;
  });
}

export async function refinePrompt(text: string, memory?: UserMemory) {
  const fallback = {
    prompt: text,
    title: "AI Short",
    caption: text.slice(0, 120)
  };

  if (!env.GMI_API_KEY) {
    return fallback;
  }

  return gmiChat<typeof fallback>(
    modelIds.kimi(),
    [
      {
        role: "system",
        content:
          "You rewrite user requests into concise video generation prompts. Return JSON with prompt, title, and caption."
      },
      {
        role: "user",
        content: JSON.stringify({ text, memory })
      }
    ],
    fallback
  );
}

export async function rankShortMoments(input: {
  textIntent?: string;
  assets: MediaAsset[];
  scenes: ShortCandidate[];
  memory?: UserMemory;
}) {
  const fallback = input.scenes
    .slice(0, 5)
    .map((scene, index) => ({ ...scene, score: scene.score || 100 - index * 7 }));

  if (!env.GMI_API_KEY) {
    return fallback;
  }

  const response = await gmiChat<{ candidates: ShortCandidate[] }>(
    modelIds.nemotron(),
    [
      {
        role: "system",
        content:
          "You are NVIDIA Nemotron 3 Nano Omni acting as a multimodal video analyst. Rank short-form video moments for retention, clarity, novelty, and visual/audio quality. Return JSON { candidates: [...] } with exactly five candidates where possible."
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ],
    { candidates: fallback }
  );

  return response.candidates.slice(0, 5);
}

export async function interpretMultimodalIntent(input: {
  text?: string;
  videos: MediaAsset[];
  images: MediaAsset[];
  memory?: UserMemory;
}) {
  const fallback = {
    editIntent: input.text ?? "Create a high-retention short.",
    stylePrompt: input.images.length > 0 ? "Use reference image style." : "Clean viral short style.",
    outputCount: 3
  };

  if (!env.GMI_API_KEY) {
    return fallback;
  }

  return gmiChatWithFallback<typeof fallback>(
    modelIds.nemotron(),
    env.GMI_GLM5_MODEL_ID,
    [
      {
        role: "system",
        content:
          "You are NVIDIA Nemotron 3 Nano Omni. Interpret text, video, and image references into a multimodal generation plan. Return JSON with editIntent, stylePrompt, outputCount, sceneSummary, pacingGuidance, and segmentPrompts."
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ],
    fallback
  );
}

async function gmiChatWithFallback<T>(
  primaryModel: string,
  fallbackModel: string | undefined,
  messages: ChatMessage[],
  fallback: T
): Promise<T> {
  try {
    return await gmiChat(primaryModel, messages, fallback);
  } catch (error) {
    if (!fallbackModel) {
      throw error;
    }

    return gmiChat(fallbackModel, messages, fallback);
  }
}

export async function generateVideoWithGmi(input: {
  mode: "text_to_video" | "image_to_video" | "video_stylize";
  prompt: string;
  title: string;
  platform: GeneratedOutput["platform"];
  sourceUrl?: string;
  imageUrl?: string;
}): Promise<GeneratedOutput> {
  const model = env.GMI_PIXVERSE_5_6_MODEL_ID ?? "not_configured";

  if (!env.GMI_API_KEY) {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      caption: input.prompt.slice(0, 160),
      platform: input.platform,
      metadata: {
        demoFallback: true,
        model,
        prompt: input.prompt
      }
    };
  }

  return withRetry("gmi.video.generate", async () => {
    const response = await fetch(env.GMI_PIXVERSE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${requireEnv("GMI_API_KEY")}`
      },
      body: JSON.stringify({
        model: modelIds.pixverse56(),
        payload: buildPixversePayload({
          prompt: input.prompt,
          mode: input.mode
        })
      }),
      signal: AbortSignal.timeout(env.GMI_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`GMI video request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return {
      id: crypto.randomUUID(),
      title: input.title,
      url: data.outcome?.video_url ?? data.url ?? data.output_url,
      gmiTaskId: data.request_id ?? data.id ?? data.task_id,
      caption: input.prompt.slice(0, 160),
      platform: input.platform,
      metadata: {
        model: modelIds.pixverse56(),
        raw: data
      }
    };
  });
}
