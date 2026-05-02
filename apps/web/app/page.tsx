import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Matcha | AI Video Workspace",
  description: "Web-first AI video generation, extraction, and direction."
};

export default function HomePage() {
  return (
    <main className="app-shell-grid relative min-h-screen overflow-x-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[800px] w-[1000px] -translate-x-1/2 opacity-20 blur-[120px] bg-[radial-gradient(ellipse_at_top,#4ce0b1_0%,transparent_70%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <nav className="flex w-full items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(180deg,#b7ffd9,#67eab8)] text-slate-950 shadow-[0_8px_20px_rgba(76,224,177,0.2)]">
              <Clapperboard className="h-4 w-4" />
            </div>
            <p className="font-semibold tracking-wide text-white">Matcha</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Link href="/login">Log in</Link>
          </Button>
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
          <div className="float-up flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Web-first AI video platform
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-medium tracking-tight text-white sm:text-7xl">
              Create, analyze, and iterate on AI video.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              One seamless workspace for text-to-video generation, intelligent clip extraction, and multimodal direction. Designed for creators who move fast.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-[0_0_40px_-10px_rgba(76,224,177,0.4)] transition-all hover:shadow-[0_0_60px_-15px_rgba(76,224,177,0.6)]">
                <Link href="/login">
                  Start creating <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
