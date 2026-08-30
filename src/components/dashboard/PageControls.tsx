"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { Business } from "@/lib/domain/business";
import { SLUG_PATTERN } from "@/lib/slug";

type Props = { business: Business; siteOrigin: string };

export function PageControls({ business, siteOrigin }: Props) {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [slug, setSlug] = useState(business.slug);

  const url = `${siteOrigin}/${business.slug}`;
  const isLive = business.status === "published";
  const host = siteOrigin.replace(/^https?:\/\//, "");

  async function run(body: Record<string, unknown>, onDone?: () => void) {
    setPending(true);
    setError(null);

    try {
      await apiRequest(`/api/pages/${business.id}`, { method: "PATCH", body });
      onDone?.();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update your page.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  const normalisedSlug = slug.trim().toLowerCase();
  const slugChanged = normalisedSlug !== business.slug;
  const slugValid = SLUG_PATTERN.test(normalisedSlug);

  return (
    <div className="card p-4">
      {renaming ? (
        <div>
          <label htmlFor="page-slug" className="mb-1 block text-[13px] font-medium">
            Page address
          </label>

          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-[13px] text-[color:var(--color-muted)]">{host}/</span>
            <input
              id="page-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={48}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-[color:var(--color-hairline)] px-3 py-2 text-[14px] outline-none"
            />
          </div>

          {slugChanged && !slugValid ? (
            <p className="mt-1 text-[12px] text-[color:var(--color-muted)]">
              Letters, numbers and hyphens only. It cannot start or end with a hyphen.
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-[color:var(--color-muted)]">
              Changing this breaks any link you have already shared.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending || !slugChanged || !slugValid}
              onClick={() =>
                void run({ intent: "rename", slug: normalisedSlug }, () => setRenaming(false))
              }
              className="brand-bg flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSlug(business.slug);
                setRenaming(false);
                setError(null);
              }}
              className="rounded-xl border border-[color:var(--color-hairline)] px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <a
              href={`/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-text min-w-0 flex-1 truncate text-[14px] underline underline-offset-2"
            >
              {url.replace(/^https?:\/\//, "")}
            </a>
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 rounded-lg border border-[color:var(--color-hairline)] px-3 py-1.5 text-[13px] font-medium"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void run({ intent: isLive ? "unpublish" : "publish" })}
              disabled={pending}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${
                isLive ? "border border-[color:var(--color-hairline)]" : "brand-bg"
              }`}
            >
              {pending ? "Saving…" : isLive ? "Unpublish" : "Publish page"}
            </button>

            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="rounded-xl border border-[color:var(--color-hairline)] px-4 py-2.5 text-sm font-medium"
            >
              Change address
            </button>
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
