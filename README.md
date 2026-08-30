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

1. **`/create`** — the owner pastes an Instagram or website link.
2. **`POST /api/import`** fetches it (`src/lib/scrape.ts`, with SSRF guards),
   strips it to text, and Claude extracts a draft profile.
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

## Security notes

- **RLS is the authorisation boundary.** Owner-facing reads and writes go through
  the session client and are enforced by policy, not by application code alone.
- **The service-role key is used in exactly two places**: reading published pages
  (public by definition) and inserting leads. Lead capture is keyed by *slug*, so
  a caller can only ever write into a page that is actually published — there is
  deliberately no public insert policy that would let anyone write anywhere.
- **URL import is SSRF-guarded.** Hostnames are resolved and checked against
  private ranges before the request, redirects are not followed (a public host
  that 302s to `169.254.169.254` would otherwise defeat the check), and the body
  is read under a hard byte ceiling.
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
