import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listByOwner } from "@/lib/repositories/businesses";

export const metadata: Metadata = { title: "Your pages", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");

  const pages = await listByOwner(user.id);

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your pages</h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-[13px] text-[color:var(--color-muted)] underline underline-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>

      {pages.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-[15px] text-[color:var(--color-muted)]">
            You haven&apos;t made a page yet.
          </p>
          <Link
            href="/create"
            className="brand-bg mt-4 inline-block rounded-xl px-5 py-3 text-sm font-medium"
          >
            Create your page
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={`/dashboard/${page.id}`} className="card block p-4 hover:bg-[color:var(--color-raised)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{page.profile.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-[color:var(--color-muted)]">
                      /{page.slug}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                      page.status === "published"
                        ? "brand-tint brand-text"
                        : "bg-[color:var(--color-raised)] text-[color:var(--color-muted)]"
                    }`}
                  >
                    {page.status === "published" ? "Live" : "Draft"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages.length > 0 ? (
        <Link
          href="/create"
          className="mt-4 block text-center text-[14px] text-[color:var(--color-muted)] underline underline-offset-2"
        >
          Create another page
        </Link>
      ) : null}
    </main>
  );
}
