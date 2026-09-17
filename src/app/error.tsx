"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Without it a thrown server error shows Next's
 * default page, which reads as "this site is broken" to an owner mid-edit.
 * Only the digest is shown: it lets support find the server log without
 * exposing the underlying message to the visitor.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-[color:var(--color-muted)]">
        This is a problem on our side. Please try again in a moment.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="brand-bg rounded-xl px-5 py-3 text-sm font-medium"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-[color:var(--color-hairline)] px-5 py-3 text-sm font-medium"
        >
          Go home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 text-[12px] text-[color:var(--color-muted)]">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
