"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

export function LoginForm({ callbackError }: { callbackError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const callbackPath = process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_PATH ?? "/auth/callback";
      const redirectTo = `${origin}${callbackPath}?next=/dashboard`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
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
    <section className="surface-panel rounded-[32px] p-6 sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-200/10 px-3 py-1 text-xs font-medium text-emerald-100">
        <Sparkles className="h-3.5 w-3.5" />
        Magic link
      </div>
      <h2 className="mt-6 text-3xl font-medium text-white sm:text-4xl">Welcome back</h2>
      <p className="mt-3 max-w-md text-sm text-zinc-400">Enter your email to sign in.</p>

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

        <Button className="w-full" type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending magic link..." : "Send magic link"}
          {status !== "sending" ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      {message ? <p className={`mt-4 text-sm ${status === "error" ? "text-red-300" : "text-emerald-100"}`}>{message}</p> : null}
      {!message && callbackError ? <p className="mt-4 text-sm text-red-300">{callbackError}</p> : null}
    </section>
  );
}
