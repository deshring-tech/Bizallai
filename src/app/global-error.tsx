"use client";

import { BRAND_COLOR } from "@/lib/site";

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces
 * that layout entirely, so it renders its own document and uses inline styles —
 * the stylesheet may be exactly what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#16171a" }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
            <p style={{ color: "#64666e", fontSize: 15 }}>Please try again in a moment.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 12,
                background: BRAND_COLOR,
                color: "#ffffff",
                border: 0,
                borderRadius: 12,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {error.digest ? (
              <p style={{ marginTop: 20, fontSize: 12, color: "#64666e" }}>
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
