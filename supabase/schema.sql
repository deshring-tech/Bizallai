-- =====================================================================
-- BizPage schema
--
-- Design notes
--   * `profile` and `theme` are jsonb because the page's editable surface
--     evolves every release; the shape is enforced in the application by
--     `src/lib/domain/business.ts`, which is also what the AI writes against.
--     Columns are reserved for things the *database* must reason about:
--     identity, ownership, lifecycle, and anything we index or join on.
--   * Row Level Security is the real authorisation boundary. The service-role
--     key bypasses it and is used only where the server has already checked
--     ownership itself (lead capture).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete set null,
  slug        text not null unique,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  profile     jsonb not null default '{}'::jsonb,
  theme       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint businesses_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$')
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
create index if not exists businesses_status_idx on public.businesses (status);

-- ---------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  phone        text not null,
  message      text,
  plan_name    text,
  kind         text not null default 'trial' check (kind in ('trial', 'booking', 'enquiry', 'renewal')),
  status       text not null default 'new'  check (status in ('new', 'contacted', 'won', 'lost')),
  created_at   timestamptz not null default now()
);

-- The dashboard always reads a single business's leads newest-first.
create index if not exists leads_business_created_idx
  on public.leads (business_id, created_at desc);

-- ---------------------------------------------------------------------
-- page_view_days
--
-- Deliberately aggregate-only: one row per business per day, holding a count.
-- No IP address, no cookie, no visitor identifier is stored anywhere, so the
-- public page needs no consent banner and there is no personal data to leak.
-- The trade-off is honest and stated in the UI: a refresh counts twice, so
-- these are page views, not unique visitors.
-- ---------------------------------------------------------------------
create table if not exists public.page_view_days (
  business_id uuid not null references public.businesses (id) on delete cascade,
  day         date not null default current_date,
  views       integer not null default 0,

  primary key (business_id, day)
);

-- Atomic increment: two concurrent visitors must not clobber each other's count.
create or replace function public.record_page_view(target_business_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.page_view_days (business_id, day, views)
  values (target_business_id, current_date, 1)
  on conflict (business_id, day)
  do update set views = public.page_view_days.views + 1;
$$;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at
  before update on public.businesses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.businesses     enable row level security;
alter table public.leads          enable row level security;
alter table public.page_view_days enable row level security;

-- Anyone may read a published page: that is the entire point of the product.
drop policy if exists "published businesses are public" on public.businesses;
create policy "published businesses are public"
  on public.businesses for select
  using (status = 'published');

drop policy if exists "owners read own businesses" on public.businesses;
create policy "owners read own businesses"
  on public.businesses for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "owners insert own businesses" on public.businesses;
create policy "owners insert own businesses"
  on public.businesses for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners update own businesses" on public.businesses;
create policy "owners update own businesses"
  on public.businesses for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners delete own businesses" on public.businesses;
create policy "owners delete own businesses"
  on public.businesses for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Leads are private to the owner. Public submission goes through the server,
-- which uses the service-role key after validating the target page exists —
-- so there is deliberately no public insert policy here.
drop policy if exists "owners read own leads" on public.leads;
create policy "owners read own leads"
  on public.leads for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = leads.business_id and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "owners update own leads" on public.leads;
create policy "owners update own leads"
  on public.leads for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = leads.business_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = leads.business_id and b.owner_id = (select auth.uid())
    )
  );

-- Owners read their own traffic. Writes happen only through
-- `record_page_view`, which is security definer, so there is no insert or
-- update policy here by design — a visitor can increment a counter but can
-- never read, edit or delete one.
drop policy if exists "owners read own page views" on public.page_view_days;
create policy "owners read own page views"
  on public.page_view_days for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = page_view_days.business_id and b.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- Storage: business photos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;

drop policy if exists "business photos are public" on storage.objects;
create policy "business photos are public"
  on storage.objects for select
  using (bucket_id = 'business-photos');

-- Uploads are namespaced by user id: <uid>/<business-id>/<file>.
drop policy if exists "owners upload business photos" on storage.objects;
create policy "owners upload business photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "owners delete business photos" on storage.objects;
create policy "owners delete business photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
