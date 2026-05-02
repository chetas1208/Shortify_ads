import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Passwordless access to Matcha"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="app-shell-grid relative min-h-screen">
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 opacity-10 blur-[100px] bg-[radial-gradient(ellipse_at_top,#4ce0b1_0%,transparent_70%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex w-full items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(180deg,#b7ffd9,#67eab8)] text-slate-950 shadow-[0_8px_20px_rgba(76,224,177,0.2)]">
              <Clapperboard className="h-3 w-3" />
            </div>
            <p className="font-semibold text-white">Matcha</p>
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <LoginForm callbackError={error} />
          </div>
        </div>
      </div>
    </main>
  );
}
