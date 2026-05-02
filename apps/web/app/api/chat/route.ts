import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { requireUserProfile } from "@/lib/auth/server";
import { models } from "@/lib/ai/models";
import { jobKinds, outputPlatforms } from "@/lib/job-types";

export const runtime = "nodejs";

const chatSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  mode: z.enum(jobKinds).default("text_to_video"),
  platform: z.enum(outputPlatforms).default("youtube_shorts"),
  youtubeUrl: z.string().trim().url().optional(),
  assets: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number()
      })
    )
    .default([])
});

function modelForMode(mode: z.infer<typeof chatSchema>["mode"]) {
  if (mode === "text_to_video") {
    return models.kimi();
  }

  return models.nemotron();
}

function systemForMode(mode: z.infer<typeof chatSchema>["mode"], assetCount: number, hasYoutubeUrl: boolean) {
  const shared =
    "You are Matcha's senior AI video producer inside a premium web dashboard. Be concise, concrete, and demo-ready. First explain what we are trying to create and the end goal. Then suggest useful reference assets that would improve quality. Then produce a structured, actionable plan the backend can turn into a job. Never claim the media is processed already; describe the intended analysis/generation plan.";

  if (mode === "video_to_shorts") {
    return `${shared}\nMode: Large Video Analysis to Best Clips. Focus on analysis intent, hook criteria, candidate clip ranking, pacing, and whether PixVerse 5.6 enhancement is worth it. The user has attached ${assetCount} asset(s). YouTube link included: ${hasYoutubeUrl ? "yes" : "no"}.`;
  }

  if (mode === "multimodal_edit") {
    return `${shared}\nMode: Text + Image + Video Guided Generation. Fuse instruction, video source, and style references. Return style summary, scene summary, intent summary, pacing guidance, segment plan, and prompt per segment. The user has attached ${assetCount} asset(s). YouTube link included: ${hasYoutubeUrl ? "yes" : "no"}.`;
  }

  return `${shared}\nMode: Text to Video. Use Kimi-style prompt rewriting. Return a cinematic prompt, title, hook, visual style, camera language, motion, subject, duration intent, and negative constraints.`;
}

export async function POST(request: Request) {
  await requireUserProfile();
  const input = chatSchema.parse(await request.json());
  const result = streamText({
    model: modelForMode(input.mode),
    system: systemForMode(input.mode, input.assets.length, Boolean(input.youtubeUrl)),
    messages: await convertToModelMessages(input.messages),
    temperature: input.mode === "text_to_video" ? 0.7 : 0.35
  });

  return result.toUIMessageStreamResponse();
}
