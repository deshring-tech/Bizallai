"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

/**
 * Email link sign-in. No password to forget and no password to leak — the right
 * trade for owners who sign in from a phone every few weeks.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = sanitiseNext(searchParams.get("next"));

  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setStatus("sending");
    setError(null);

    const { error: authError } = await browserClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="card brand-tint p-6 text-center">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
          We sent you a sign-in link. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1.5 text-[15px] text-[color:var(--color-muted)]">
        To edit your page and see who got in touch.
      </p>

      <label htmlFor="email" className="mt-6 mb-1 block text-[13px] font-medium">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-xl border border-[color:var(--color-hairline)] px-4 py-3 text-[15px] outline-none"
      />

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="brand-bg mt-4 w-full rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

/** Only same-site relative paths, so `?next=` cannot become an open redirect. */
function sanitiseNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
