-- Phase 4: Marketplace Research Engine
-- Stores normalized, observable listing data only (not private ranking/search APIs).

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  research_session_id uuid references public.research_sessions (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  marketplace text not null default 'Fiverr',
  page_type text not null default 'other'
    check (page_type in ('gig', 'search', 'seller', 'other')),
  source_url text not null,
  title text,
  category text,
  tags text[] not null default '{}',
  description text,
  price_text text,
  price_amount numeric,
  currency text,
  reviews_count integer,
  rating numeric,
  seller_name text,
  seller_level text,
  delivery_time text,
  packages jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  raw_observable jsonb not null default '{}'::jsonb,
  extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_url)
);

create index if not exists marketplace_listings_user_id_idx
  on public.marketplace_listings (user_id);

create index if not exists marketplace_listings_session_id_idx
  on public.marketplace_listings (research_session_id);

drop trigger if exists marketplace_listings_set_updated_at on public.marketplace_listings;
create trigger marketplace_listings_set_updated_at
  before update on public.marketplace_listings
  for each row execute function public.set_updated_at();

alter table public.marketplace_listings enable row level security;

drop policy if exists "Listings select own" on public.marketplace_listings;
create policy "Listings select own"
  on public.marketplace_listings for select
  using (auth.uid() = user_id);

drop policy if exists "Listings insert own" on public.marketplace_listings;
create policy "Listings insert own"
  on public.marketplace_listings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Listings update own" on public.marketplace_listings;
create policy "Listings update own"
  on public.marketplace_listings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Listings delete own" on public.marketplace_listings;
create policy "Listings delete own"
  on public.marketplace_listings for delete
  using (auth.uid() = user_id);
