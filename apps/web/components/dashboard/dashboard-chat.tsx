"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Send,
  Sparkles,
  Video,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedOutput, JobKind, JobProgress, JobRecord, OutputPlatform } from "@/lib/job-types";

type DashboardChatProps = {
  activeJob?: JobRecord;
  activeProgress: JobProgress | null;
  completedJobs: JobRecord[];
  mode: JobKind;
  platform: OutputPlatform;
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  youtubeUrl: string;
  setYoutubeUrl: Dispatch<SetStateAction<string>>;
  videoFiles: File[];
  imageFiles: File[];
  onVideoUploadClick: () => void;
  onImageUploadClick: () => void;
  onRemoveVideo: (index: number) => void;
  onRemoveImage: (index: number) => void;
  onCreateJob: () => Promise<void>;
  isSubmitting: boolean;
};

function fallbackPrompt(mode: JobKind, videoFiles: File[], imageFiles: File[], youtubeUrl: string) {
  if (mode === "video_to_shorts") {
    return `Analyze the source video and surface the strongest short clips.${youtubeUrl ? ` YouTube source: ${youtubeUrl}` : ""} Assets: ${videoFiles.map((file) => file.name).join(", ")}`;
  }

  if (mode === "multimodal_edit") {
    return `Use the attached media to build a guided generation plan.${youtubeUrl ? ` YouTube source: ${youtubeUrl}` : ""} Video: ${videoFiles.map((file) => file.name).join(", ")} Images: ${imageFiles.map((file) => file.name).join(", ")}`;
  }

  return "Create a cinematic AI video from this prompt.";
}

function extractOutputs(job: JobRecord): GeneratedOutput[] {
  return Array.isArray(job.result?.outputs) ? (job.result?.outputs as GeneratedOutput[]) : [];
}

function thumbnailForOutput(output: GeneratedOutput) {
  const metadata = output.metadata as { thumbnailUrl?: string; raw?: { outcome?: { thumbnail_image_url?: string } } } | undefined;
  return metadata?.thumbnailUrl ?? metadata?.raw?.outcome?.thumbnail_image_url;
}

function canSubmit(
  mode: JobKind,
  prompt: string,
  youtubeUrl: string,
  videoFiles: File[],
  imageFiles: File[]
) {
  if (mode === "text_to_video") {
    return prompt.trim().length > 0;
  }

  if (mode === "video_to_shorts") {
    return youtubeUrl.trim().length > 0 || videoFiles.length > 0;
  }

  return prompt.trim().length > 0 && (youtubeUrl.trim().length > 0 || videoFiles.length > 0 || imageFiles.length > 0);
}

function pipelineForMode(mode: JobKind) {
  if (mode === "video_to_shorts") {
    return ["ingest", "preprocess", "analyze", "rank"];
  }

  if (mode === "multimodal_edit") {
    return ["ingest", "interpret", "generate", "stitch"];
  }

  return ["prompt", "refine", "generate"];
}

export function DashboardChat({
  activeJob,
  activeProgress,
  completedJobs,
  mode,
  platform,
  prompt,
  setPrompt,
  youtubeUrl,
  setYoutubeUrl,
  videoFiles,
  imageFiles,
  onVideoUploadClick,
  onImageUploadClick,
  onRemoveVideo,
  onRemoveImage,
  onCreateJob,
  isSubmitting
}: DashboardChatProps) {
  const [isPlanning, setIsPlanning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" })
  });

  const recentOutputs = completedJobs.flatMap(extractOutputs).slice(0, 2);
  const ready = canSubmit(mode, prompt, youtubeUrl, videoFiles, imageFiles);
  const busy = isSubmitting || isPlanning || status === "submitted" || status === "streaming";

  async function draftPlan() {
    const text = prompt.trim() || fallbackPrompt(mode, videoFiles, imageFiles, youtubeUrl);
    setIsPlanning(true);

    try {
      await sendMessage(
        { text },
        {
          body: {
            mode,
            platform,
            youtubeUrl: youtubeUrl.trim() || undefined,
            assets: [...videoFiles, ...imageFiles].map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size
            }))
          }
        }
      );
    } finally {
      setIsPlanning(false);
    }
  }

  async function createJob() {
    await draftPlan();
    await onCreateJob();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div className="grid min-h-[72vh] gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-0 flex-col rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          {messages.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5">
              <p className="text-sm font-medium text-white">Start.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-[20px] border px-4 py-4 ${
                message.role === "user"
                  ? "border-emerald-300/18 bg-emerald-300/8"
                  : "border-white/8 bg-white/[0.03]"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                {message.role === "user" ? "You" : "Plan"}
              </p>
              <div className="mt-2 space-y-2 text-sm leading-7 text-zinc-200">
                {message.parts.map((part, index) => (part.type === "text" ? <p key={index}>{part.text}</p> : null))}
              </div>
            </div>
          ))}

          {activeJob ? (
            <div className="rounded-[20px] border border-sky-300/14 bg-sky-300/8 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{activeProgress?.message ?? activeJob.stage}</p>
                <span className="rounded-full border border-sky-300/18 px-2.5 py-1 text-[11px] text-sky-100">
                  {activeProgress?.progress ?? activeJob.progress}%
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8ff5c3,#4ce0b1)]"
                  style={{ width: `${activeProgress?.progress ?? activeJob.progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {recentOutputs.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {recentOutputs.map((output) => (
                <div key={output.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Output</p>
                  {output.url ? (
                    <video
                      key={output.url}
                      src={output.url}
                      poster={thumbnailForOutput(output)}
                      controls
                      playsInline
                      preload="metadata"
                      className="mt-3 aspect-video w-full rounded-[16px] bg-black object-cover"
                    />
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-white">{output.title}</p>
                  {output.caption ? <p className="mt-2 text-sm text-zinc-400">{output.caption}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/8 p-3 sm:p-4">
          <div className="rounded-[22px] border border-white/10 bg-[rgba(8,14,22,0.9)] p-3 sm:p-4">
            <div className="grid gap-3">
              <Textarea
                ref={textareaRef}
                value={prompt}
                rows={1}
                onInput={(event) => {
                  const node = event.currentTarget;
                  node.style.height = "auto";
                  node.style.height = `${Math.min(node.scrollHeight, 220)}px`;
                }}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  mode === "text_to_video"
                    ? "Describe the video"
                    : mode === "video_to_shorts"
                      ? "Goal or constraints"
                      : "Describe the output"
                }
                className="max-h-[220px] min-h-[110px] bg-black/20"
              />

              {(mode === "video_to_shorts" || mode === "multimodal_edit") ? (
                <Input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="Paste YouTube link" />
              ) : null}

              {(mode === "video_to_shorts" || mode === "multimodal_edit") ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Video className="h-4 w-4" />
                      <span>Video</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={onVideoUploadClick}>
                      Add video
                    </Button>
                  </div>
                  {videoFiles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {videoFiles.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-zinc-300">
                          {file.name}
                          <button type="button" onClick={() => onRemoveVideo(index)} className="text-zinc-500 transition hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {mode === "multimodal_edit" ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <ImageIcon className="h-4 w-4" />
                      <span>Images</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={onImageUploadClick}>
                      Add images
                    </Button>
                  </div>
                  {imageFiles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {imageFiles.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-zinc-300">
                          {file.name}
                          <button type="button" onClick={() => onRemoveImage(index)} className="text-zinc-500 transition hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {pipelineForMode(mode).map((step) => (
                  <span key={step} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {step}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={draftPlan} disabled={busy || !ready}>
                    <Send className="h-4 w-4" />
                    Plan
                  </Button>
                  <Button onClick={createJob} disabled={busy || !ready}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "text_to_video" ? <Sparkles className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                    Run
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">Target: short-form reel</p>
              </div>

              {error ? <p className="text-sm text-red-300">{error.message}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <aside className="grid gap-3">
        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Selected flow</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {mode === "text_to_video" ? "Text to Video" : mode === "video_to_shorts" ? "Long Video to Shorts" : "Multimodal Edit"}
          </p>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Needed</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {mode === "text_to_video" ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Text</span>
            ) : null}
            {mode === "video_to_shorts" ? (
              <>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Text</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Video</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">YT link</span>
              </>
            ) : null}
            {mode === "multimodal_edit" ? (
              <>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Text</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Images</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">Video</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">YT link</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Status</p>
          <p className="mt-2 text-sm text-zinc-300">{activeProgress?.message ?? activeJob?.stage ?? "Idle"}</p>
        </div>
      </aside>
    </div>
  );
}
