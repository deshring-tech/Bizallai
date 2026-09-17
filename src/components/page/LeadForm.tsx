"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { LeadKind } from "@/lib/domain/lead";

type FieldName = "name" | "phone" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

type Status =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent"; whatsappUrl: string | null }
  | { phase: "error"; message: string; fields: FieldErrors };

type Props = {
  slug: string;
  actionLabel: string;
  /** Pre-filled when the visitor arrived via a specific plan. */
  planName?: string;
  kind?: LeadKind;
  /** The public example page: show the success state without writing a lead. */
  demo?: boolean;
};

type ResponseBody = {
  whatsappUrl?: string | null;
  error?: { message?: string; details?: unknown };
};

export function LeadForm({ slug, actionLabel, planName, kind = "trial", demo = false }: Props) {
  const nameId = useId();
  const phoneId = useId();
  const messageId = useId();

  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const fields = status.phase === "error" ? status.fields : {};

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.phase === "sending") return;

    if (demo) {
      setStatus({ phase: "sent", whatsappUrl: null });
      return;
    }

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
          website: String(form.get("website") ?? "") || undefined,
          planName,
          kind,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ResponseBody;

      if (!response.ok) {
        setStatus({
          phase: "error",
          message: payload.error?.message ?? "Could not send that. Please try again.",
          fields: toFieldErrors(payload.error?.details),
        });
        return;
      }

      setStatus({ phase: "sent", whatsappUrl: payload.whatsappUrl ?? null });
    } catch {
      setStatus({ phase: "error", message: "Check your connection and try again.", fields: {} });
    }
  }

  if (status.phase === "sent") {
    return (
      <div className="card brand-tint p-5 text-center" role="status">
        <p className="font-medium">{demo ? "This is where your request would go" : "Request sent."}</p>
        <p className="mt-1 text-[14px] text-[color:var(--color-muted)]">
          {demo
            ? "On a real page, the business receives your details and contacts you on the number you gave."
            : "They will contact you on the number you gave."}
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
    <form
      onSubmit={handleSubmit}
      // Typing into a field is the visitor fixing the problem, so stale errors go.
      onChange={() => {
        if (status.phase === "error") setStatus({ phase: "idle" });
      }}
      className="card p-4"
      noValidate
    >
      {planName ? (
        <p className="mb-3 text-[13px] text-[color:var(--color-muted)]">
          Enquiring about <span className="font-medium text-[color:var(--color-ink)]">{planName}</span>
        </p>
      ) : null}

      {/*
        Honeypot. Hidden from people and from assistive technology; bots that
        fill in every input give themselves away. Moved off-screen rather than
        `display: none`, which many bots know to skip.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-3">
        <Field id={nameId} label="Your name" error={fields.name}>
          <input
            id={nameId}
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Sunita Rai"
            aria-invalid={fields.name ? true : undefined}
            aria-describedby={fields.name ? `${nameId}-error` : undefined}
            className={inputClass(Boolean(fields.name))}
          />
        </Field>

        <Field id={phoneId} label="Phone number" error={fields.phone}>
          <input
            id={phoneId}
            name="phone"
            required
            type="tel"
            inputMode="tel"
            maxLength={32}
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            aria-invalid={fields.phone ? true : undefined}
            aria-describedby={fields.phone ? `${phoneId}-error` : undefined}
            className={inputClass(Boolean(fields.phone))}
          />
        </Field>

        <Field id={messageId} label="Anything to add (optional)" error={fields.message}>
          <textarea
            id={messageId}
            name="message"
            rows={2}
            maxLength={400}
            placeholder="Best time to reach me is evenings"
            aria-invalid={fields.message ? true : undefined}
            aria-describedby={fields.message ? `${messageId}-error` : undefined}
            className={`${inputClass(Boolean(fields.message))} resize-none`}
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
        Your number is shared only with this business.{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
    </form>
  );
}

function inputClass(invalid: boolean): string {
  return `w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none ${
    invalid ? "border-red-500" : "border-[color:var(--color-hairline)]"
  }`;
}

/** The API reports field problems as `{ field: message }`; keep only the fields this form has. */
function toFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object") return {};

  const source = details as Record<string, unknown>;
  const errors: FieldErrors = {};

  for (const key of ["name", "phone", "message"] as const) {
    const value = source[key];
    if (typeof value === "string") errors[key] = value;
  }

  return errors;
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[12px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
