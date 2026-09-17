import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SITE_TAGLINE } from "@/lib/site";

const STEPS = [
  {
    title: "Start from what you have",
    body: "Paste your website and we read the photos, prices and hours. No website? Describe your business in a few words.",
  },
  {
    title: "Answer two questions",
    body: "We ask only what's missing, in plain language. No design decisions, no templates.",
  },
  {
    title: "Share one link",
    body: "Customers see your prices, tap once to enquire, and reach you on WhatsApp.",
  },
];

/* Each claim below describes something the product does today. Keep it that way. */
const FEATURES = [
  { title: "Prices up front", body: "The first thing a customer wants to know, shown first." },
  { title: "One-tap enquiries", body: "Name and number, sent straight to your inbox." },
  { title: "WhatsApp and a QR code", body: "Reply where you already chat, and print your link for the door." },
  { title: "Ready for Google", body: "Every page carries the business details search engines read." },
];

const BUSINESS_TYPES = ["Gyms", "Salons", "Clinics", "Studios", "Tutors", "Freelancers"];

export default function LandingPage() {
  return (
    <>
      <main className="mx-auto max-w-[760px] px-5 py-14 sm:py-20">
        <section className="text-center">
          <p className="brand-text text-xs font-medium tracking-wide uppercase">For small businesses</p>

          <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">{SITE_TAGLINE}</h1>

          <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-[color:var(--color-muted)] sm:text-[17px]">
            Not a website with ten pages nobody reads. One page with your prices, your photos and a
            button that gets you the booking.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/create"
              className="brand-bg w-full rounded-xl px-6 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 sm:w-auto"
            >
              Build my page — it&apos;s free
            </Link>
            <Link
              href="/demo"
              className="w-full rounded-xl border border-[color:var(--color-hairline)] px-6 py-3.5 text-sm font-medium sm:w-auto"
            >
              See an example page
            </Link>
          </div>

          <p className="mt-3 text-[13px] text-[color:var(--color-muted)]">
            Live in under a minute. No account needed to start.
          </p>
        </section>

        <section className="mt-16" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="sr-only">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="card p-5">
                <span className="brand-tint brand-text inline-grid h-7 w-7 place-items-center rounded-full text-[13px] font-medium">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-medium">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--color-muted)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="what-you-get">
          <h2 id="what-you-get" className="text-center text-xl font-semibold">
            Everything a customer needs to say yes
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-2xl bg-[color:var(--color-raised)] p-5">
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1 text-[14px] text-[color:var(--color-muted)]">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 text-center" aria-labelledby="built-for">
          <h2 id="built-for" className="text-xl font-semibold">
            Built for businesses people book, not browse
          </h2>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {BUSINESS_TYPES.map((type) => (
              <li
                key={type}
                className="rounded-full border border-[color:var(--color-hairline)] px-3.5 py-1.5 text-[13px]"
              >
                {type}
              </li>
            ))}
          </ul>

          <Link
            href="/create"
            className="brand-bg mt-10 inline-block rounded-xl px-6 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Build my page
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
