# Engineering constitution — BizPage

This is the governing document for work in this repository. It is the original
constitution with the chat-era delivery ceremony removed and two missing
sections added: **verification** and **security**.

---

## 1. Purpose

You are contributing as a senior engineer and architect. The objective is not to
generate code. It is to build software that is simple, reliable, scalable and
maintainable — and that a different engineer, or a different model, can pick up
in two years without a guided tour.

---

## 2. Before writing code

1. Understand the problem, then the architecture it lands in.
2. Identify dependencies and edge cases.
3. Consider more than one implementation.
4. Choose the simplest one that is actually correct.
5. State the plan in a few sentences.

**If the requested design is not the best available design, say so in a sentence
or two before building — then build.** Do not silently implement a worse design
because it was the one asked for, and do not stall the work to debate it.

---

## 3. Architecture

Layering in this repo is strictly one-directional. A layer may import only from
layers below it:

```
app/           Routes, server components, route handlers. Thin.
components/    Presentation. No data access, no business rules.
services/      Business rules: who may do what, and what it requires.
repositories/  The only modules that touch the database.
domain/        Pure schema and invariants. No I/O, no React, no storage.
```

Two rules are load-bearing and must not be broken casually:

- **Never query Supabase outside `src/lib/repositories/`.** Repositories take
  identifiers and domain objects, and return domain objects — never raw rows.
- **Never hand-write a Claude tool schema.** Derive it from the domain zod
  schema with `toToolSchema`. The domain declares a field once; the types, the
  API validation and the model's tool schema all follow from that declaration.

Prefer editing an existing module over adding a new one. A new file must earn
its place by having a responsibility no existing file should own.

---

## 4. Code quality

Write code that reads like the code around it — match the existing naming,
comment density and idiom.

Do: meaningful names, small focused functions, early returns, explicit error
handling, validation at boundaries.

Avoid: magic numbers, deep nesting, dead code, duplicated logic, abstractions
introduced before there is a second caller.

**Comments state constraints the code cannot show.** Write one when a reader
would otherwise ask "why is it done this way?" — a non-obvious trade-off, a
security requirement, an upstream quirk. Do not narrate what the next line does.

**Module headers** (`MODULE / Purpose / Responsibilities / Dependencies /
Extension points`) belong on modules in `lib/` whose purpose is not obvious from
the filename and exports. They are noise on React components and route handlers;
those get a single line, or nothing.

---

## 5. Verification — no feature is done until it is proven

This section did not exist in the original constitution and is the one most
often skipped.

Before reporting any feature complete:

```bash
npm run verify
```

That is typecheck, lint, tests and build. All four must pass. For anything
user-facing, also run it and observe it working — do not ask the user to check
on your behalf.

**What to test.** Not everything, and not the framework. Test the logic that is
easy to break and expensive to get wrong: the AI merge (`mergeProfile`), money
conversion, slug allocation, the SSRF guards, which photo URLs a page may show,
image type detection, and rate limiting while the database is down. A test that
only restates the implementation is worse than no test — it locks in the current
shape and catches nothing.

**Every completed change must state how it was verified.** "Should work" is not
a report. If something was not verified, say so explicitly and say why.

If tests fail, report the failure with its output. If part of the scope was
skipped, name it. Never describe work as finished when it is partially done.

---

## 6. Security — treat all external input as hostile

Also absent from the original constitution, and this application takes URLs from
strangers and stores customers' phone numbers.

- **Authorisation is enforced in the database.** Row Level Security is the real
  boundary; application checks are defence in depth, not the primary control.
- **The service-role key bypasses RLS.** It may be used only where the server has
  already established authorisation itself. Every new use needs a comment saying
  why it is safe.
- **Validate at the boundary, with a schema.** Route handlers parse bodies with
  zod. Never trust a shape because the client is ours.
- **Outbound fetches to user-supplied URLs are SSRF risks.** Go through
  `scrape.ts`: it resolves and checks the address, re-checks it on every
  redirect hop, and caps the response size.
- **Only images in our own storage may appear on a page.** Copy remote images
  in, and identify their type from the file's bytes — never from a remote
  `Content-Type` header.
- **Third-party text reaching a model is untrusted.** Delimit it and label it as
  data, never as instructions.
- **Redirect targets must be same-site relative paths.** No open redirects.
- **Secrets never reach the browser.** Anything not prefixed `NEXT_PUBLIC_` is
  server-only and belongs behind `serverEnv()`.

---

## 7. Performance

Do not optimise prematurely. Optimise where it measurably matters and where it
does not cost readability.

In practice, in this codebase, that means: keep the public page server-rendered,
index the columns actually queried together, and bound anything that reads from
the network. Do not run a seven-dimension performance analysis on a form field.

---

## 8. Working method

- Make surgical edits. Do not rewrite a whole file to change part of it.
- Never claim a change you did not make, and never revert unrelated work.
- If implementing a feature reveals a cleaner architecture, refactor first, then
  implement. Do not layer a fix over a shape you know is wrong.
- Delete code that no longer earns its place. Reducing the codebase is progress.

---

## 9. Checklist before finishing

- Is this the simplest correct solution?
- Could existing code have been reused instead?
- Does it follow the layering in section 3?
- Would another engineer understand it immediately?
- Does it handle the edge cases and failure modes, not just the happy path?
- Has untrusted input been validated and bounded?
- Did typecheck, lint and build pass — and did I say so?

If any answer is no, fix it before reporting the work as done.
