import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SITE_NAME } from "@/lib/site";

/** Shared frame for the privacy and terms pages. A route group, so URLs are unaffected. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-[680px] px-5 py-12">
        <Link
          href="/"
          className="text-[13px] text-[color:var(--color-muted)] underline underline-offset-2"
        >
          ← {SITE_NAME}
        </Link>
        <article className="legal mt-6">{children}</article>
      </main>
      <SiteFooter />
    </>
  );
}
