"use client";

import { useId, useState } from "react";
import type { LeadKind } from "@/lib/domain/lead";

type Status =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent"; whatsappUrl: string | null }
  | { phase: "error"; message: string };

type Props = {
  slug: string;
  actionLabel: string;
  /** Pre-filled when the visitor arrived via a specific plan. */
  planName?: string;
  kind?: LeadKind;
};

export function LeadForm({ slug, actionLabel, planName, kind = "trial" }: Props) {
  const nameId = useId();
  const phoneId = useId();
  const messageId = useId();

  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.phase === "sending") return;

    const form = new FormData(event.currentTarget);
    setStatus({ phase: "sending" });

    try {
      const response = await fetch(`/api/p/${encodeURIComponent(slug)}/leads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          message: String(form.get("message") ?? "") || undefined,
          planName,
          kind,
        }),
      });

      const payload = (await response.json()) as {
        whatsappUrl?: string | null;
        error?: { message?: string };
      };

      if (!response.ok) {
        setStatus({
          phase: "error",
          message: payload.error?.message ?? "Could not send that. Please try again.",
        });
        return;
      }

      setStatus({ phase: "sent", whatsappUrl: payload.whatsappUrl ?? null });
    } catch {
      setStatus({ phase: "error", message: "Check your connection and try again." });
    }
  }

  if (status.phase === "sent") {
    return (
      <div className="card brand-tint p-5 text-center">
        <p className="font-medium">Request sent.</p>
        <p className="mt-1 text-[14px] text-[color:var(--color-muted)]">
          They will contact you on the number you gave.
        </p>
        {status.whatsappUrl ? (
          <a
            href={status.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-bg mt-4 inline-block w-full rounded-xl px-4 py-3 text-sm font-medium"
          >
            Message them on WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4" noValidate>
      {planName ? (
        <p className="mb-3 text-[13px] text-[color:var(--color-muted)]">
          Enquiring about <span className="font-medium text-[color:var(--color-ink)]">{planName}</span>
        </p>
      ) : null}

      <div className="space-y-3">
        <Field id={nameId} label="Your name">
          <input
            id={nameId}
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Sunita Rai"
            className="w-full rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-2.5 text-[15px] outline-none"
          />
        </Field>

        <Field id={phoneId} label="Phone number">
          <input
            id={phoneId}
            name="phone"
            required
            type="tel"
            inputMode="tel"
            maxLength={32}
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            className="w-full rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-2.5 text-[15px] outline-none"
          />
        </Field>

        <Field id={messageId} label="Anything to add (optional)">
          <textarea
            id={messageId}
            name="message"
            rows={2}
            maxLength={400}
            placeholder="Best time to reach me is evenings"
            className="w-full resize-none rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-2.5 text-[15px] outline-none"
          />
        </Field>
      </div>

      {status.phase === "error" ? (
        <p role="alert" className="mt-3 text-[13px] text-red-600">
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.phase === "sending"}
        className="brand-bg mt-4 w-full rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status.phase === "sending" ? "Sending…" : actionLabel}
      </button>

      <p className="mt-2 text-center text-[12px] text-[color:var(--color-muted)]">
        Your number is shared only with this business.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
