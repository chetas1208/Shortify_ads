import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clapperboard, Layers3, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Passwordless access to the Matcha AI video workspace"
};

const proofPoints = [
  "Creator-grade workspace, not chatbot chrome",
  "Live progress from upload to stitched result",
  "Built for text, clip extraction, and multimodal generation"
];

const workflowTiles = [
  { label: "Text to video", icon: Sparkles },
  { label: "Long video analysis", icon: Clapperboard },
  { label: "Multimodal direction", icon: Layers3 }
];

export default function LoginPage() {
  return (
    <main className="app-shell-grid min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to landing
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-200/10 px-3 py-1 text-xs font-medium text-emerald-100 sm:flex">
            <span className="status-dot" />
            Passwordless entry flow
          </div>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <section className="surface-panel ambient-border flex flex-col justify-between rounded-[32px] p-6 sm:p-8 lg:p-10">
            <div>
              <div className="section-label">
                <Sparkles className="h-3.5 w-3.5" />
                AI video control room
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-[linear-gradient(180deg,rgba(162,255,215,1),rgba(95,231,184,0.92))] text-slate-950 shadow-[0_16px_50px_rgba(76,224,177,0.3)]">
                  <Clapperboard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Matcha</p>
                  <p className="text-base font-semibold text-white">Cinematic AI video workspace</p>
                </div>
              </div>
              <h1 className="mt-10 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                Enter a polished workspace for AI video creation, clip discovery, and multimodal iteration.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                The product is designed to feel like serious creator software from the first click. The login flow should feel just as clean.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Inside the product</p>
                <div className="mt-4 space-y-4">
                  {proofPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
                      <p className="text-sm leading-7 text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                <div className="grid gap-3">
                  {workflowTiles.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.06] text-emerald-100">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-zinc-200">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
