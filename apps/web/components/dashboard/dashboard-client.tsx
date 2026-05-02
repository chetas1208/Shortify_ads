"use client";

import { useEffect, useRef, useState } from "react";
import {
  Film,
  History,
  Layers3,
  Link2,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Video
} from "lucide-react";
import { DashboardChat } from "@/components/dashboard/dashboard-chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GeneratedOutput, JobKind, JobProgress, JobRecord, OutputPlatform } from "@/lib/job-types";

type DashboardClientProps = {
  email?: string | null;
  initialJobs: JobRecord[];
};

type DashboardView = "workspace" | "history" | "results" | "settings";

const workflowOptions: Array<{ value: JobKind; label: string; icon: typeof Sparkles }> = [
  { value: "text_to_video", label: "Text", icon: Sparkles },
  { value: "video_to_shorts", label: "Clips", icon: Video },
  { value: "multimodal_edit", label: "Multimodal", icon: Layers3 }
];

const navItems: Array<{ value: DashboardView; label: string; icon: typeof Film }> = [
  { value: "workspace", label: "Workspace", icon: Film },
  { value: "history", label: "History", icon: History },
  { value: "results", label: "Results", icon: Link2 },
  { value: "settings", label: "Settings", icon: Settings }
];

function extractOutputs(job: JobRecord): GeneratedOutput[] {
  return Array.isArray(job.result?.outputs) ? (job.result?.outputs as GeneratedOutput[]) : [];
}

function statusTone(status: JobRecord["status"]) {
  if (status === "completed") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "failed") {
    return "border-red-300/20 bg-red-300/10 text-red-100";
  }

  if (status === "running") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-100";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function DashboardClient({ email, initialJobs }: DashboardClientProps) {
  const [view, setView] = useState<DashboardView>("workspace");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<JobKind>("text_to_video");
  const [platform] = useState<OutputPlatform>("youtube_shorts");
  const [text, setText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState(initialJobs);
  const [activeProgress, setActiveProgress] = useState<JobProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(initialJobs[0]?.id);
  const videoRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const activeJob = jobs.find((job) => job.status === "queued" || job.status === "running") ?? jobs[0];
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? activeJob;
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const outputCount = completedJobs.reduce((sum, job) => sum + extractOutputs(job).length, 0);

  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/jobs/${activeJob.id}/progress`);
      if (!response.ok) {
        return;
      }

      const progress = (await response.json()) as JobProgress;
      setActiveProgress(progress);
      setJobs((current) =>
        current.map((job) =>
          job.id === activeJob.id
            ? {
                ...job,
                status: progress.status,
                stage: progress.stage,
                progress: progress.progress
              }
            : job
        )
      );
    }, 1500);

    return () => window.clearInterval(timer);
  }, [activeJob]);

  function selectMode(nextMode: JobKind) {
    setMode(nextMode);

    if (nextMode === "text_to_video") {
      setYoutubeUrl("");
      setVideoFiles([]);
      setImageFiles([]);
      return;
    }

    if (nextMode === "video_to_shorts") {
      setImageFiles([]);
    }
  }

  function onVideoFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith("video/"));
    if (nextFiles.length === 0) {
      return;
    }

    setVideoFiles(mode === "multimodal_edit" ? (current) => [...current, ...nextFiles] : nextFiles.slice(0, 1));
  }

  function onImageFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (nextFiles.length === 0) {
      return;
    }

    setImageFiles((current) => [...current, ...nextFiles]);
  }

  function removeVideo(index: number) {
    setVideoFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeImage(index: number) {
    setImageFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function uploadFile(file: File) {
    const presign = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type, bytes: file.size })
    });

    if (!presign.ok) {
      throw new Error((await presign.json()).error ?? "Upload presign failed");
    }

    const data = await presign.json();
    const upload = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file
    });

    if (!upload.ok) {
      throw new Error("R2 upload failed");
    }

    await fetch("/api/uploads/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: data.assetId })
    });

    return data.assetId as string;
  }

  async function submit() {
    setIsSubmitting(true);

    try {
      const assetIds = [];
      for (const file of [...videoFiles, ...imageFiles]) {
        assetIds.push(await uploadFile(file));
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          platform,
          text: text.trim() || undefined,
          youtubeUrl: youtubeUrl.trim() || undefined,
          assetIds
        })
      });

      if (!response.ok) {
        throw new Error((await response.json()).error ?? "Job creation failed");
      }

      const { job } = await response.json();
      setJobs((current) => [job, ...current]);
      setSelectedJobId(job.id);
      setView("workspace");
      setText("");
      setYoutubeUrl("");
      setVideoFiles([]);
      setImageFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-transparent px-3 py-3 sm:px-4">
      <div className="mx-auto flex max-w-[1500px] gap-3">
        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/55 backdrop-blur-sm transition lg:hidden",
            sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />

        <aside
          className={cn(
            "surface-panel fixed inset-y-3 left-3 z-40 flex w-[248px] flex-col rounded-[28px] p-4 transition-transform lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Matcha</p>
              <p className="text-xs text-zinc-500">{email ?? "Signed in"}</p>
            </div>
            <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              Close
            </Button>
          </div>

          <div className="mt-6 grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setView(item.value);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-left text-sm transition",
                  view === item.value
                    ? "border-emerald-300/20 bg-emerald-300/10 text-white"
                    : "border-transparent text-zinc-400 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <p className="px-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Stats</p>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-2xl font-semibold text-white">{jobs.length}</p>
              <p className="text-sm text-zinc-400">Jobs</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-2xl font-semibold text-white">{outputCount}</p>
              <p className="text-sm text-zinc-400">Outputs</p>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Button className="w-full" variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>

        <section className="grid min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-panel flex min-w-0 flex-col rounded-[28px]">
            <header className="border-b border-white/8 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="secondary" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Workspace</p>
                    <h1 className="text-2xl font-semibold text-white">Create</h1>
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                  {activeJob ? activeJob.status : "idle"}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {workflowOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => selectMode(option.value)}
                    className={cn(
                      "flex items-center justify-between rounded-[22px] border px-4 py-4 text-left transition",
                      mode === option.value
                        ? "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(40,120,99,0.34),rgba(22,34,44,0.9))] text-white"
                        : "border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <option.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </header>

            <div className="min-h-0 flex-1 p-3 sm:p-4">
              {view === "workspace" ? (
                <DashboardChat
                  activeJob={activeJob}
                  activeProgress={activeProgress}
                  completedJobs={completedJobs}
                  imageFiles={imageFiles}
                  isSubmitting={isSubmitting}
                  mode={mode}
                  onCreateJob={submit}
                  onImageUploadClick={() => imageRef.current?.click()}
                  onRemoveImage={removeImage}
                  onRemoveVideo={removeVideo}
                  onVideoUploadClick={() => videoRef.current?.click()}
                  platform={platform}
                  prompt={text}
                  setPrompt={setText}
                  setYoutubeUrl={setYoutubeUrl}
                  videoFiles={videoFiles}
                  youtubeUrl={youtubeUrl}
                />
              ) : null}

              {view === "history" ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {jobs.length === 0 ? (
                    <Card className="p-6">
                      <p className="text-sm font-medium text-white">No history</p>
                    </Card>
                  ) : (
                    jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          setView("workspace");
                        }}
                        className="surface-subtle rounded-[24px] p-4 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{job.kind.replaceAll("_", " ")}</p>
                            <p className="mt-2 text-sm font-semibold text-white">{job.input.text || job.input.youtubeUrl || "Media job"}</p>
                          </div>
                          <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", statusTone(job.status))}>{job.status}</span>
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">{formatTime(job.updatedAt)}</p>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {view === "results" ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {completedJobs.flatMap((job) =>
                    extractOutputs(job).map((output) => (
                      <Card key={output.id} className="overflow-hidden p-0">
                        <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top_left,rgba(143,245,195,0.15),transparent_32%),linear-gradient(180deg,rgba(13,20,32,0.96),rgba(8,12,20,0.96))] p-4">
                          <div className="flex h-full flex-col justify-between rounded-[20px] border border-white/8 bg-black/15 p-4">
                            <span className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              {output.platform.replaceAll("_", " ")}
                            </span>
                            <div>
                              <p className="text-lg font-semibold text-white">{output.title}</p>
                              <p className="mt-2 text-sm text-zinc-400">{output.caption || "Generated result"}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                  {outputCount === 0 ? (
                    <Card className="p-6">
                      <p className="text-sm font-medium text-white">No outputs</p>
                    </Card>
                  ) : null}
                </div>
              ) : null}

              {view === "settings" ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Account</p>
                    <p className="mt-3 text-lg font-semibold text-white">{email ?? "No email"}</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Default output</p>
                    <p className="mt-3 text-lg font-semibold text-white">30s reel workflow</p>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="surface-panel hidden rounded-[28px] p-4 xl:flex xl:flex-col">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Progress</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Run status</h2>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{selectedJob?.kind.replaceAll("_", " ") ?? "No job"}</p>
                {selectedJob ? (
                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", statusTone(selectedJob.status))}>
                    {selectedJob.status}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8ff5c3,#4ce0b1)]"
                  style={{
                    width: `${selectedJob?.id === activeJob?.id ? activeProgress?.progress ?? selectedJob?.progress ?? 0 : selectedJob?.progress ?? 0}%`
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                {selectedJob?.id === activeJob?.id ? activeProgress?.message ?? selectedJob?.stage : selectedJob?.stage ?? "Idle"}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Recent</p>
              <div className="mt-3 space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className="w-full rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white">{job.input.text || job.input.youtubeUrl || "Media job"}</p>
                      <span className="text-[11px] text-zinc-500">{job.progress}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          multiple={mode === "multimodal_edit"}
          hidden
          onChange={(event) => {
            onVideoFilesSelected(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            onImageFilesSelected(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </div>
    </main>
  );
}
