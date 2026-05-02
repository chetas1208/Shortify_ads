import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Clapperboard,
  Clock3,
  Layers3,
  Play,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Matcha | AI Video Studio",
  description: "A cinematic web-first workspace for text-to-video, long-form clipping, and multimodal AI video generation."
};

const workflows = [
  {
    title: "Text to video",
    eyebrow: "Workflow 01",
    description:
      "Start with a rough prompt, let Kimi refine the creative direction, and dispatch PixVerse generation from the same workspace.",
    bullets: ["Prompt refinement in-thread", "Cinematic style guidance", "One-click iteration loops"]
  },
  {
    title: "Long video to best clips",
    eyebrow: "Workflow 02",
    description:
      "Drop in a source video or link, watch analysis stages update live, and review ranked moments that are ready for short-form publishing.",
    bullets: ["Clip ranking with retention logic", "Live preprocessing states", "Structured shortlist cards"]
  },
  {
    title: "Multimodal guided generation",
    eyebrow: "Workflow 03",
    description:
      "Fuse text, images, and source footage into a guided plan with scene logic, style signals, and final stitched outputs.",
    bullets: ["Image and video references", "Segment-level planning", "Result history and reuse"]
  }
];

const features = [
  {
    title: "Creator workspace, not chatbot chrome",
    description:
      "The dashboard is organized around thread clarity, media context, progress intelligence, and result review instead of generic message bubbles."
  },
  {
    title: "Live pipeline visibility",
    description:
      "Track upload, preprocessing, ranking, generation, and stitching from one coherent progress rail with timestamps and next actions."
  },
  {
    title: "Reusable project memory",
    description:
      "HydraDB-backed memory makes preferences, style direction, and past accepted outputs easier to carry between iterations."
  },
  {
    title: "Built for demos and real usage",
    description:
      "Fast paths, polished empty states, and high-trust UI make the product feel credible during a pitch and usable after the demo."
  }
];

const steps = [
  {
    title: "Describe the outcome",
    copy: "Start from intent, references, or raw footage. The composer adapts whether you are generating, clipping, or combining media."
  },
  {
    title: "Review the AI plan",
    copy: "The assistant turns requests into an actionable creation plan with workflow-specific reasoning and cleaner generation instructions."
  },
  {
    title: "Track generation live",
    copy: "Progress states update in context so users understand what the system is doing instead of waiting on a blank spinner."
  },
  {
    title: "Refine and reuse",
    copy: "Outputs, prompts, and prior runs stay accessible so iteration feels like working in software, not restarting from scratch."
  }
];

export default function HomePage() {
  return (
    <main className="app-shell-grid min-h-screen overflow-x-hidden px-4 pb-14 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="surface-panel ambient-border sticky top-4 z-30 flex items-center justify-between rounded-full px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(162,255,215,1),rgba(95,231,184,0.92))] text-slate-950 shadow-[0_16px_40px_rgba(76,224,177,0.25)]">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold tracking-[-0.04em] text-white">Matcha</p>
              <p className="text-xs text-zinc-400">Cinematic AI video workspace</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white" href="#workflows">
              Workflows
            </Link>
            <Link className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white" href="#product">
              Product
            </Link>
            <Link className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white" href="#faq">
              Why it wins
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
          </div>
        </nav>

        <section className="hero-glow grid gap-10 pb-18 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-18">
          <div className="float-up">
            <div className="section-label">
              <Sparkles className="h-3.5 w-3.5" />
              Web-first AI video platform
            </div>
            <h1 className="mt-7 max-w-5xl text-[3.45rem] font-semibold leading-[0.95] text-white sm:text-[4.8rem] lg:text-[6.4rem]">
              Create, analyze, and iterate on AI video inside one premium control room.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Matcha unifies text-to-video, long-form clip extraction, and multimodal guided generation in a single
              cinematic workspace built for creators, teams, and demo moments that need to look credible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Start creating <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard">
                  <Play className="h-4 w-4" />
                  Preview dashboard
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["3 workflows", "One dashboard for generation, clipping, and multimodal direction"],
                ["Live pipeline", "Progress states stay visible instead of disappearing behind loaders"],
                ["Memory-backed", "Style and preferences carry forward for faster iteration"]
              ].map(([title, copy]) => (
                <div key={title} className="surface-subtle rounded-[24px] p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="float-up lg:pl-8" style={{ animationDelay: "120ms" }}>
            <Card className="ambient-border overflow-hidden p-3 sm:p-4">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,24,0.95),rgba(8,11,19,0.88))] p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/80">Workspace preview</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">Launch teaser orchestration</h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-200/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    <span className="status-dot" />
                    Generating
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="space-y-4">
                    <div className="surface-subtle rounded-[24px] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Thread</p>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-[20px] bg-white/[0.04] p-3">
                          <p className="text-xs text-zinc-500">You</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-200">
                            Build a high-end launch teaser with glass reflections, slow camera drift, and a polished brand reveal.
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-emerald-200/15 bg-emerald-200/8 p-3">
                          <p className="text-xs text-emerald-100/80">Matcha producer</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-100">
                            Refined the prompt, selected a cinematic pacing pass, and queued PixVerse generation with audio enabled.
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-xs text-zinc-500">System</p>
                          <div className="mt-3 space-y-2">
                            {[
                              ["Preprocessing", "Complete", "100%"],
                              ["Prompt refinement", "Complete", "100%"],
                              ["PixVerse dispatch", "In progress", "72%"]
                            ].map(([label, state, width]) => (
                              <div key={label}>
                                <div className="flex items-center justify-between text-xs text-zinc-300">
                                  <span>{label}</span>
                                  <span className="text-emerald-100">{state}</span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                                  <div className="pulse-line h-full rounded-full bg-[linear-gradient(90deg,#8ff5c3,#84a8ff)]" style={{ width }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="surface-subtle rounded-[24px] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Attached context</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Moodboard.jpg", "Product closeup.mov", "Launch_notes.txt"].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="surface-subtle rounded-[24px] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Active output</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">16:9 cinematic teaser</h3>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                          1080p
                        </div>
                      </div>
                      <div className="mt-4 aspect-[16/10] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(143,245,195,0.22),transparent_30%),linear-gradient(180deg,rgba(18,24,37,0.96),rgba(7,11,18,0.96))] p-4">
                        <div className="flex h-full items-end justify-between rounded-[18px] border border-white/8 bg-black/20 p-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Preview state</p>
                            <p className="mt-2 max-w-[16rem] text-sm leading-6 text-zinc-200">
                              Cinematic reflections, controlled motion, and a premium reveal shot designed for launch-week social cuts.
                            </p>
                          </div>
                          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.06]">
                            <Play className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="surface-subtle rounded-[24px] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Top clip score</p>
                        <p className="mt-2 text-4xl font-semibold text-white">92</p>
                        <p className="mt-2 text-sm text-zinc-400">Retention-ranked moment from long-form analysis.</p>
                      </div>
                      <div className="surface-subtle rounded-[24px] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Iteration speed</p>
                        <p className="mt-2 text-4xl font-semibold text-white">Fast</p>
                        <p className="mt-2 text-sm text-zinc-400">History, memory, and uploads stay in the same thread.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="workflows" className="pb-16 pt-6">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="section-label">
                <WandSparkles className="h-3.5 w-3.5" />
                Three workflows, one workspace
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">Purpose-built for modern AI video creation.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Every workflow gets its own interaction pattern, progress language, and result surface so the product feels intentional instead of “one UI for everything.”
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {workflows.map((workflow, index) => (
              <Card key={workflow.title} className="ambient-border overflow-hidden p-0">
                <div className="h-full rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{workflow.eyebrow}</p>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-emerald-100">
                      {index === 0 ? <Sparkles className="h-5 w-5" /> : index === 1 ? <Clock3 className="h-5 w-5" /> : <Layers3 className="h-5 w-5" />}
                    </div>
                  </div>
                  <h3 className="mt-8 text-2xl font-semibold text-white">{workflow.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">{workflow.description}</p>
                  <div className="soft-divider my-6" />
                  <ul className="space-y-3 text-sm text-zinc-300">
                    {workflow.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-200" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="product" className="grid gap-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6 sm:p-8">
            <div className="section-label">
              <BrainCircuit className="h-3.5 w-3.5" />
              How it works
            </div>
            <div className="mt-8 space-y-6">
              {steps.map((step, index) => (
                <div key={step.title} className="grid gap-4 sm:grid-cols-[auto_1fr]">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-emerald-100">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-400">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="py-12">
          <Card className="ambient-border overflow-hidden p-0">
            <div className="grid gap-8 rounded-[28px] bg-[linear-gradient(135deg,rgba(16,24,36,0.98),rgba(8,12,20,0.98))] px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="section-label">Why this feels premium</div>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Clear hierarchy. Real-time confidence. Creator-grade polish.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-300">
                  Matcha is designed to make the product story obvious in the first 20 seconds: everything about the interface says “this is a serious AI video tool.”
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/login">
                    Launch demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/8 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <p>Matcha. Web-first AI video creation for text, clip intelligence, and multimodal direction.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition hover:text-white">
              Log in
            </Link>
            <Link href="/dashboard" className="transition hover:text-white">
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
