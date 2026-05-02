"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

const redirectTo = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  : undefined;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) {
        throw error;
      }

      setStatus("sent");
      setMessage("Magic link sent. Open your inbox to enter the workspace.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send login link.");
    }
  }

  return (
    <section className="surface-panel ambient-border rounded-[32px] p-6 sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-200/10 px-3 py-1 text-xs font-medium text-emerald-100">
        <Sparkles className="h-3.5 w-3.5" />
        Secure magic-link access
      </div>
      <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">Log in to Matcha</h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-zinc-400">
        Clean entry, no password sprawl, and no extra handoff. One email link drops you back into the dashboard.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="creator@studio.com"
              className="pl-11"
              required
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-200" />
            <div>
              <p className="text-sm font-semibold text-white">Demo-safe access pattern</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Sign-in is intentionally lightweight so the flow feels premium and frictionless on desktop, tablet, and mobile.
              </p>
            </div>
          </div>
        </div>

        <Button className="w-full" type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending magic link..." : "Send magic link"}
          {status !== "sending" ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-300" : "text-emerald-100"}`}>{message}</p>
      ) : null}
    </section>
  );
}
