import Link from "next/link";

const STEPS = [
  {
    title: "Paste your link",
    body: "Your Instagram or old website. We read what's already there — photos, prices, hours.",
  },
  {
    title: "Answer two questions",
    body: "We ask only what's missing, in plain language. No design decisions, no templates.",
  },
  {
    title: "Share one link",
    body: "Customers see your prices, tap once to book, and reach you on WhatsApp.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-[760px] px-5 py-14 sm:py-20">
      <section className="text-center">
        <p className="brand-text text-xs font-medium tracking-wide uppercase">For small businesses</p>

        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
          One page where customers can actually book
        </h1>

        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-[color:var(--color-muted)] sm:text-[17px]">
          Not a website with ten pages nobody reads. One page with your prices, your photos and a
          button that gets you the booking.
        </p>

        <Link
          href="/create"
          className="brand-bg mt-7 inline-block rounded-xl px-6 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Build my page — it&apos;s free
        </Link>

        <p className="mt-3 text-[13px] text-[color:var(--color-muted)]">
          Live in under a minute. No account needed to start.
        </p>
      </section>

      <section className="mt-16">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card p-5">
              <span className="brand-tint brand-text inline-grid h-7 w-7 place-items-center rounded-full text-[13px] font-medium">
                {index + 1}
              </span>
              <h2 className="mt-3 font-medium">{step.title}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--color-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 text-center">
        <h2 className="text-xl font-semibold">Built for businesses people book, not browse</h2>
        <p className="mx-auto mt-2 max-w-[480px] text-[15px] text-[color:var(--color-muted)]">
          Gyms, salons, clinics, studios and tutors — anywhere a customer needs the price, the
          reviews, and a way to say yes.
        </p>
      </section>

      <footer className="mt-16 flex items-center justify-center gap-4 text-[13px] text-[color:var(--color-muted)]">
        <Link href="/create" className="underline underline-offset-2">
          Create a page
        </Link>
        <Link href="/dashboard" className="underline underline-offset-2">
          Sign in
        </Link>
      </footer>
    </main>
  );
}
