"use client";

import { useState } from "react";

type Props = {
  ready: boolean;
  publishing: boolean;
  publishedUrl: string | null;
  /** Present only for an anonymous publish, where the page still needs claiming. */
  claimHref: string | null;
  error: string | null;
  onPublish: () => void;
};

export function PublishPanel({
  ready,
  publishing,
  publishedUrl,
  claimHref,
  error,
  onPublish,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  if (publishedUrl) {
    return (
      <div className="card brand-tint p-4">
        <p className="text-sm font-medium">Your page is live.</p>

        <div className="mt-2 flex items-center gap-2">
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-text min-w-0 flex-1 truncate text-[14px] underline underline-offset-2"
          >
            {publishedUrl.replace(/^https?:\/\//, "")}
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 rounded-lg border border-[color:var(--color-hairline)] bg-white px-3 py-1.5 text-[13px] font-medium"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {claimHref ? (
          <>
            {/*
              The page exists but belongs to nobody yet. Until the owner signs
              in they cannot edit it or see who got in touch, so this is the
              most important thing on the screen at this moment.
            */}
            <a
              href={claimHref}
              className="brand-bg mt-3 block rounded-xl px-4 py-3 text-center text-sm font-medium"
            >
              Save this page to my account
            </a>
            <p className="mt-2 text-[12px] text-[color:var(--color-muted)]">
              Takes a few seconds. Without this you can&apos;t edit the page or see enquiries.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            Put this link in your Instagram bio. Enquiries appear in your dashboard.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onPublish}
        disabled={!ready || publishing}
        className="brand-bg w-full rounded-xl px-4 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {publishing ? "Publishing…" : ready ? "Publish my page" : "Keep answering to publish"}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
