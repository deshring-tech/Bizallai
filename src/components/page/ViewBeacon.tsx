"use client";

import { useEffect } from "react";

/**
 * Reports that the page was opened, once per mount.
 *
 * `sendBeacon` is used because it survives the visitor navigating away
 * immediately — the common case on a phone — and because it is fire-and-forget,
 * so counting traffic never delays anything the visitor is waiting for.
 * Renders nothing.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const url = `/api/p/${encodeURIComponent(slug)}/view`;

    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url);
      return;
    }

    void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [slug]);

  return null;
}
