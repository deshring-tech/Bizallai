import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">This page isn&apos;t here</h1>
      <p className="mt-2 text-[15px] text-[color:var(--color-muted)]">
        The link may be wrong, or the business hasn&apos;t published their page yet.
      </p>
      <Link
        href="/"
        className="brand-bg mt-6 rounded-xl px-5 py-3 text-sm font-medium"
      >
        Make your own page
      </Link>
    </main>
  );
}
