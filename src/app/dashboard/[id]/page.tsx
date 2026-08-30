import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LeadsInbox } from "@/components/dashboard/LeadsInbox";
import { PageControls } from "@/components/dashboard/PageControls";
import { QrCard } from "@/components/dashboard/QrCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { currentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { absoluteUrl, siteUrl } from "@/lib/env";
import { qrSvg } from "@/lib/qr";
import { trafficForBusiness } from "@/lib/repositories/analytics";
import { findOwned } from "@/lib/repositories/businesses";
import { listForBusiness } from "@/lib/repositories/leads";

const TRAFFIC_DAYS = 30;

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PageDashboard({ params }: Props) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/${id}`)}`);

  const business = await findOwned(id, user.id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "not_found") notFound();
    throw error;
  });

  // Independent reads, so fetch them together rather than in series.
  const [leads, traffic] = await Promise.all([
    listForBusiness(business.id),
    trafficForBusiness(business.id, TRAFFIC_DAYS),
  ]);

  const unread = leads.filter((lead) => lead.status === "new").length;

  const since = Date.now() - TRAFFIC_DAYS * 24 * 60 * 60 * 1000;
  const recentEnquiries = leads.filter(
    (lead) => new Date(lead.createdAt).getTime() >= since,
  ).length;

  const publicUrl = absoluteUrl(`/${business.slug}`);
  // A QR pointing at an unpublished page would scan straight to a 404.
  const qr = business.status === "published" ? await qrSvg(publicUrl) : null;

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-5 py-8">
      <Link
        href="/dashboard"
        className="text-[13px] text-[color:var(--color-muted)] underline underline-offset-2"
      >
        ← All pages
      </Link>

      <div className="mt-3 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{business.profile.name}</h1>
        <Link
          href={`/dashboard/${business.id}/edit`}
          className="shrink-0 rounded-xl border border-[color:var(--color-hairline)] px-4 py-2 text-[14px] font-medium"
        >
          Edit page
        </Link>
      </div>

      <div className="mt-4">
        <PageControls business={business} siteOrigin={siteUrl} />
      </div>

      {business.status === "published" ? (
        <div className="mt-4">
          <StatsCard traffic={traffic} enquiries={recentEnquiries} days={TRAFFIC_DAYS} />
        </div>
      ) : null}

      {qr ? (
        <div className="mt-4">
          <QrCard svg={qr} slug={business.slug} url={publicUrl} />
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Enquiries{unread > 0 ? <span className="brand-text"> · {unread} new</span> : null}
        </h2>
        <div className="mt-3">
          <LeadsInbox leads={leads} />
        </div>
      </section>
    </main>
  );
}
