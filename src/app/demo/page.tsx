import type { Metadata } from "next";
import Link from "next/link";
import { BusinessPageView } from "@/components/page/BusinessPageView";
import { demoBusiness } from "@/lib/demo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Example page — ${SITE_NAME}`,
  description: `See what a ${SITE_NAME} page looks like before you build your own.`,
  // A fictional business with invented reviews: useful to people, not to search results.
  robots: { index: false, follow: true },
};

export default function DemoPage() {
  return (
    <main className="min-h-dvh bg-[color:var(--color-raised)]">
      <div
        role="note"
        className="sticky top-0 z-20 bg-[color:var(--color-ink)] px-4 py-2.5 text-center text-[13px] text-white"
      >
        Example page — this business is fictional.{" "}
        <Link href="/create" className="font-medium underline underline-offset-2">
          Build yours in a minute
        </Link>
      </div>

      <BusinessPageView business={demoBusiness} demo />
    </main>
  );
}
