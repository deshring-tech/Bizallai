/** Skeleton for dashboard routes, which wait on authenticated database reads. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-5 py-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>
      <div className="h-7 w-48 animate-pulse rounded-lg bg-[color:var(--color-raised)]" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-20 animate-pulse rounded-2xl bg-[color:var(--color-raised)]" />
        ))}
      </div>
    </main>
  );
}
