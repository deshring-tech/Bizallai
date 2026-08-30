/**
 * ROUTE  /claim/[id]
 *
 * Closes the loop on anonymous creation: a visitor publishes a page before
 * signing up, then lands here after signing in and the page becomes theirs.
 *
 * Security: `claimOwnership` only adopts a page whose `owner_id` is still null,
 * so this can never take a page from another account. The id is a v4 UUID that
 * is never exposed publicly — only the creating client and the owner see it —
 * so it is not enumerable.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import * as pages from "@/lib/services/pages";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClaimPage({ params }: Props) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/claim/${id}`)}`);

  try {
    await pages.claim(id, user.id);
  } catch (error) {
    if (error instanceof AppError) return <ClaimFailed message={error.message} />;
    throw error;
  }

  redirect(`/dashboard/${id}`);
}

function ClaimFailed({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">We couldn&apos;t link that page</h1>
      <p className="mt-2 text-[15px] text-[color:var(--color-muted)]">{message}</p>
      <Link href="/dashboard" className="brand-bg mt-6 rounded-xl px-5 py-3 text-sm font-medium">
        Go to your pages
      </Link>
    </main>
  );
}
