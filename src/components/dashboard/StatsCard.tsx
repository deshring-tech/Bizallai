import type { Traffic } from "@/lib/repositories/analytics";

type Props = {
  traffic: Traffic;
  enquiries: number;
  days: number;
};

/**
 * Answers the owner's first question after sharing their link: is it working?
 *
 * The conversion rate is the number that changes behaviour — it turns "43
 * people looked" into "7 of them asked to join", which is what makes an owner
 * share the link again.
 */
export function StatsCard({ traffic, enquiries, days }: Props) {
  const conversion = traffic.total > 0 ? Math.round((enquiries / traffic.total) * 100) : null;
  const peak = traffic.points.reduce((max, point) => Math.max(max, point.views), 0);

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">Last {days} days</h2>
        {conversion !== null ? (
          <span className="text-[13px] text-[color:var(--color-muted)]">
            <span className="brand-text font-medium">{conversion}%</span> enquired
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Page views" value={traffic.total} />
        <Stat label="Enquiries" value={enquiries} />
      </dl>

      {peak > 0 ? (
        <>
          <Sparkline points={traffic.points} peak={peak} />
          <p className="mt-2 text-[12px] text-[color:var(--color-muted)]">
            Page views, not unique visitors — we store no cookies or visitor data.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-[color:var(--color-muted)]">
          No visits yet. Share your link or put your QR code up to get started.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="brand-tint rounded-xl px-3 py-2.5">
      <dt className="text-[12px] text-[color:var(--color-muted)]">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}

/**
 * Bars rather than a chart library: the shape of the last few weeks is all the
 * owner needs, and it costs no JavaScript at all.
 */
function Sparkline({ points, peak }: { points: Traffic["points"]; peak: number }) {
  return (
    <div className="mt-4 flex h-12 items-end gap-0.5" aria-hidden="true">
      {points.map((point) => (
        <div
          key={point.day}
          title={`${point.day}: ${point.views}`}
          className="brand-bg min-h-[2px] flex-1 rounded-sm"
          style={{ height: `${Math.round((point.views / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
}
