import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileEditor } from "@/components/dashboard/editor/ProfileEditor";
import { currentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { findOwned } from "@/lib/repositories/businesses";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: Props) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/${id}/edit`)}`);

  const business = await findOwned(id, user.id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "not_found") notFound();
    throw error;
  });

  return (
    <main className="mx-auto min-h-dvh max-w-[1120px] px-4 py-6">
      <Link
        href={`/dashboard/${business.id}`}
        className="text-[13px] text-[color:var(--color-muted)] underline underline-offset-2"
      >
        ← Back to {business.profile.name}
      </Link>

      <h1 className="mt-3 mb-5 text-2xl font-semibold">Edit page</h1>

      <ProfileEditor business={business} userId={user.id} />
    </main>
  );
}
