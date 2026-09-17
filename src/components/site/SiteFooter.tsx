import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const LINKS = [
  { href: "/create", label: "Create a page" },
  { href: "/demo", label: "See an example" },
  { href: "/dashboard", label: "Sign in" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

/** Footer for the marketing and legal pages. Business pages carry their own. */
export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--color-hairline)] px-5 py-8">
      <nav
        aria-label="Footer"
        className="mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-[color:var(--color-muted)]"
      >
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline-offset-2 hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 text-center text-[12px] text-[color:var(--color-muted)]">
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </footer>
  );
}
