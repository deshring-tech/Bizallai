# BizPage

One page per business, where the customer can see the price and act on it.

Not a website builder. The product is the shortest possible path from *a customer
finds you* to *a customer books you*: an AI interview builds the page in under a
minute, the page is a single server-rendered screen, and every enquiry lands in
the owner's inbox with a WhatsApp button next to it.

---

## Architecture

Layers, strictly one-directional — a layer may only import from the ones below it.

```
app/         Routes, server components, route handlers.  Thin.
components/  Presentation. No data access, no business rules.
services/    Business rules: who may publish, what publishing requires.
repositories/  The only modules that touch Supabase. Rows in, domain objects out.
domain/      Pure schema and invariants. No I/O, no React, no storage.
```

Two decisions carry most of the design:

**The domain schema is generated once and consumed three ways.**
`src/lib/domain/business.ts` declares the profile in zod. That single declaration
produces the TypeScript types, the API request validation, *and* the Claude tool
`input_schema` (via `toToolSchema`). The model physically cannot return a shape
the database cannot store, and adding a page section is a one-file change that
every layer picks up.

**The profile is `jsonb`, identity is columns.**
Columns exist for what the *database* must reason about — ownership, lifecycle,
anything indexed or joined. The editable surface of a page changes every release
and lives in `jsonb`, validated by the domain schema on the way in and out.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

In a new [Supabase](https://supabase.com) project, open the SQL editor and run
[`supabase/schema.sql`](supabase/schema.sql). It creates both tables, the
`updated_at` trigger, every Row Level Security policy, and the public photo
bucket. It is idempotent — safe to re-run after edits.

### 3. Configure

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key — **server only** |
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com) |
| `NEXT_PUBLIC_SITE_URL` | your deployed origin, no trailing slash |

Missing or malformed values fail at startup with a message naming the variable,
rather than surfacing as a confusing runtime error later.

### 4. Enable email sign-in

Supabase → Authentication → Providers → Email. Turn on "Email OTP". Add
`{your-site-url}/auth/callback` to the allowed redirect URLs.

### 5. Run

```bash
npm run dev
```

---

## Deploying

Any Node host works; Vercel needs no configuration beyond the environment
variables above. Set `NEXT_PUBLIC_SITE_URL` to the production origin before the
first deploy — canonical URLs, OG tags and the sitemap are all derived from it.

```bash
npm run build && npm start
```

---

## How a page gets made

1. **`/create`** — the owner pastes their website, or goes straight to the
   interview. Instagram, Facebook and TikTok links are refused up front with a
   clear message: those sites send automated visitors to a login page, so an
   import from them could only fail.
2. **`POST /api/import`** fetches the page (`src/lib/scrape.ts`), strips it to
   text, and Claude extracts a draft profile. At the same time the page's
   images are copied into our own storage (`src/lib/image-import.ts`). Pages
   only ever show images we host: `next/image` refuses unknown hosts, and
   social-media image links expire.
3. **`POST /api/onboarding`** runs the interview. It is stateless: the client
   holds the transcript and the accumulated profile, so a dropped request costs
   one turn rather than the session. `mergeProfile` makes later answers win only
   when they carry something, so a forgetful turn cannot erase earlier answers.
4. **`POST /api/pages`** creates the page. Sign-in is deliberately *not* required
   — an anonymous visitor gets a live page and claims it afterwards. Asking for
   an account before showing value is where most owners drop out.
5. **`/claim/[id]`** closes that loop. After publishing anonymously the owner is
   sent to `/login?next=/claim/<id>`; the auth callback returns them to the claim
   page, which adopts the draft and lands them on the dashboard. Adoption only
   succeeds while `owner_id` is null, so it can never take another account's page.
6. **`/[slug]`** serves the page: server-rendered, `LocalBusiness` JSON-LD,
   revalidated every 60s. Only plan selection and the lead form ship JavaScript.
7. **`POST /api/p/[slug]/leads`** captures the enquiry and returns a WhatsApp
   deep link so the conversation continues where the owner actually reads it.

Photos can be added at any point during setup, **before there is an account**:
the browser shrinks the file, `POST /api/uploads` confirms the bytes really are
an image, and it is stored with the service-role key. Anonymous visitors cannot
write to storage directly — the policy keys every object to a user id — and a
page with no pictures is not worth publishing.

The dashboard also carries a **printable QR code** for the published URL. It is
generated on the server (`src/lib/qr.ts`), so the QR library never enters the
browser bundle — adding it grew the dashboard route by 0.7 kB. In these markets
a sticker on the door converts better than a link in a bio.

---

## Editing a published page

`/dashboard/[id]/edit` is the correction surface. The AI gets a page roughly
right in a minute; this is where the owner fixes the rest, with a live preview
beside the form.

Photos upload **directly from the browser to Supabase storage** — large files
never touch our server, and the storage policy requires the first path segment
to equal the uploader's user id. `src/lib/storage.ts` builds that path rather
than accepting one from the caller, which is what makes the policy enforceable
instead of merely conventional.

Money is edited in major units and stored in minor units. The conversion asks
`Intl` how many decimal places a currency actually has rather than assuming 100,
so a zero-decimal currency (JPY, KRW) is not stored 100× too large.

---

## Traffic stats

The dashboard shows page views, enquiries and the conversion rate between them
for the last 30 days. That ratio is the number that changes an owner's
behaviour — "43 people looked, 7 asked to join" is what makes them share the
link again.

**Storage is aggregate-only.** One row per business per day holding a count.
No IP address, no cookie, no visitor identifier is stored anywhere, so the
public page needs no consent banner and there is no personal data to leak. The
honest trade-off is stated in the UI: a refresh counts twice, so these are page
views rather than unique visitors.

Increments go through a `security definer` Postgres function, so an anonymous
visitor can add to a counter without holding any table privilege — there is no
insert policy on the table at all, and no way to read or edit a counter without
owning the business.

---

## Email

Two different things send email, and both need a real provider before launch.
Resend covers both.

**Sign-in links (Supabase Auth).** Supabase's built-in mailer only delivers to
members of your own Supabase team and is heavily rate-limited, so real owners
will not receive sign-in links until you connect your own SMTP server:

1. Create a Resend account and verify your sending domain.
2. Create a Resend API key with sending access.
3. In the Supabase dashboard's Authentication settings, open **SMTP Settings**
   and enable custom SMTP: host `smtp.resend.com`, port `465`, username
   `resend`, and the API key as the password.
4. Set the sender to an address on your verified domain.

**Enquiry notifications (this app).** Set `RESEND_API_KEY` and `EMAIL_FROM`.
When an enquiry arrives on a claimed page, its owner gets a plain-text email
with the customer's name, number and a WhatsApp reply link. It is sent after the
visitor's response (`after()` in `services/leads.ts`), so a slow or failing
provider never affects the enquiry. Without the two variables the app logs one
warning and carries on; enquiries still reach the dashboard.

---

## Abuse and cost controls

- **Rate limits are shared across servers.** Counters live in Postgres
  (`hit_rate_limit`), so they hold on serverless hosting, where each instance
  has its own memory. If the database is slow or down, each instance falls back
  to its own in-memory counter — limiting degrades, it never switches off. Page
  view counting uses only the in-memory limiter, since a view is not worth a
  database round trip.
- **IP addresses are never stored.** Limiter keys use a keyed hash of the
  client address.
- **AI spend has a daily ceiling.** Setup chat turns and imports share
  `AI_DAILY_REQUEST_LIMIT` per UTC day across all visitors, on top of the
  per-visitor limits. Also set a monthly spend limit in the Anthropic console
  as the final backstop.
- **Enquiry forms carry a honeypot.** A submission that fills the hidden field
  gets an ordinary success response and is not stored.
- **Every unhandled server error is logged as one JSON line** by
  `src/instrumentation.ts`, tagged with the digest the error page shows the
  visitor. Hook an error tracker such as Sentry in there when you want alerts.

---

## Before launch

The code is launch-ready; these steps are not code and cannot be done from the
repository. Work through them in order.

1. **Name the product.** `src/lib/site.ts` holds the name, tagline and brand
   colour. Every page title, icon, share card and footer reads from it.
2. **Set `NEXT_PUBLIC_CONTACT_EMAIL`.** `/privacy` and `/terms` show a visible
   `[contact address not yet configured]` warning until it is set.
3. **Have `/privacy` and `/terms` reviewed by a lawyer** for each market you
   launch in. They are plain-language drafts that accurately describe what the
   code does, not legal advice.
4. **Re-run `supabase/schema.sql`** and set `NEXT_PUBLIC_SITE_URL` to the
   production origin — canonical URLs, share cards and QR codes derive from it.
5. **Prove Row Level Security.** Sign in as a second account and open the first
   account's `/dashboard/<id>`. It must 404. This is the authorisation boundary
   and it has never been exercised against a live database.
6. **Check a share card.** Paste a published page link into WhatsApp, or into
   Facebook's Sharing Debugger, and confirm the preview card renders.
7. **Connect email** — custom SMTP in Supabase for sign-in links, and
   `RESEND_API_KEY` plus `EMAIL_FROM` for enquiry notifications. See
   [Email](#email). Without SMTP, owners cannot sign in.
8. **Cap AI spend.** Set a monthly limit in the Anthropic console, and adjust
   `AI_DAILY_REQUEST_LIMIT` to match.

### What visitors see before they sign up

- `/demo` — a fictional example page, clearly labelled, so prospects see the
  product before building. Its enquiry form simulates success and writes
  nothing. It is excluded from search indexing because its reviews are invented.
- `/privacy` and `/terms` — linked from every marketing page and from the
  enquiry form on every business page.
- Generated favicon, home-screen icon, web manifest and share cards. Business
  pages get their own card with name, price and rating, because a link preview
  renders small and a photo cannot say what the business charges.

---

## Security notes

- **RLS is the authorisation boundary.** Owner-facing reads and writes go through
  the session client and are enforced by policy, not by application code alone.
- **The service-role key is used in exactly two places**: reading published pages
  (public by definition) and inserting leads. Lead capture is keyed by *slug*, so
  a caller can only ever write into a page that is actually published — there is
  deliberately no public insert policy that would let anyone write anywhere.
- **URL import is SSRF-guarded.** Hostnames are resolved and checked against
  private ranges before every request. Redirects are followed by hand and each
  hop is re-checked, so a public host that 302s to `169.254.169.254` is refused
  just like a direct link. Bodies are read under a hard byte ceiling.
- **Pages only show images we host.** Imported images are copied into our
  bucket, typed from their own file signature (never the remote
  `Content-Type`, so an SVG or HTML file cannot slip in), and the API strips any
  other photo URL from a saved profile.
- **The counter functions are not public.** `record_page_view` and
  `hit_rate_limit` are `security definer`, so execute rights are revoked from
  the anon and authenticated roles; otherwise anyone with the public key could
  inflate view counts or reset rate limits.
- **Scraped page text is untrusted.** It is delimited and explicitly labelled as
  data in the prompt so instructions inside a third-party page are summarised,
  never followed.
- **`?next=` is restricted to same-site relative paths** in both the login form
  and the auth callback, so neither can become an open redirect.
- **Database calls are time-bounded.** supabase-js has no request timeout of its
  own, so `src/lib/supabase/server.ts` imposes one. Without it a slow database
  hangs a page render indefinitely instead of failing cleanly.

### Re-running the schema

`supabase/schema.sql` is idempotent, so re-run the whole file after pulling
changes. The analytics table, its `record_page_view` function and its policy
were added after the first release — an existing project needs the file re-run
before the dashboard's stats card will work.

---

## Deliberately not built yet

Named so nobody re-derives the reasoning later:

- **Payments.** The data model is ready for it: money is already stored in minor
  units as integers, plans carry a recurring `period`, and `markStatus('won')` is
  the hook where an amount collected gets recorded.
- **Renewal reminders.** The highest-margin feature and the reason owners stay.
  It needs the WhatsApp Business API and a scheduler, and it needs real member
  data — which only exists once payments do.
- **AI poster/video generation.** Retention feature. It costs real compute and
  should be sold as credits, so it waits for a billing system.
- **Per-visitor personalisation.** Requires customer identity, which requires
  payments. A phase-3 feature that reads like a phase-1 one.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run verify` | typecheck + lint + tests + build — the gate before any commit |
| `npm test` | Unit tests once |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Tests

`npm test` — 54 unit tests, no network, no database, under a second.

The suite deliberately covers only logic that is easy to break and expensive to
get wrong, rather than chasing coverage:

- **`mergeProfile`** — the interview's safety net. The model resends the whole
  profile every turn; these tests pin down that a turn which forgets a field
  cannot erase what the owner already said.
- **Money conversion** — round-trips per currency, including the zero-decimal
  case that would otherwise store ¥3,000 as ¥300,000.
- **Slug allocation** — collision counters, and that a business can never take
  a slug that would shadow an application route.
- **SSRF guards** — loopback, private IPv4/IPv6, IPv4-mapped IPv6, and the
  `169.254.169.254` cloud metadata address are all refused.
- **Domain schema** — the defaults every layer relies on, and the inputs that
  must be rejected rather than coerced.

Tests import server-only modules, so `vitest.config.ts` stubs the `server-only`
marker and supplies placeholder environment values. No test makes a real call.
