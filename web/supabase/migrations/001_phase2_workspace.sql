-- Phase 2: User Account & Workspace
-- Run this in the Supabase SQL Editor (or via CLI).
-- Identity lives in auth.users; public.profiles is the freelancer workspace.

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  freelancer_name text,
  email text,
  marketplaces text[] not null default '{}',
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Services offered by the freelancer
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_user_id_idx on public.services (user_id);

-- Research sessions (structure ready; engine arrives in later phases)
create table if not exists public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  title text not null,
  query text,
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_sessions_user_id_idx
  on public.research_sessions (user_id);

-- Saved opportunities (structure ready; gap engine arrives later)
create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  research_session_id uuid references public.research_sessions (id) on delete set null,
  title text not null,
  summary text,
  marketplace text,
  buyer_intent text,
  competition_signal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_opportunities_user_id_idx
  on public.saved_opportunities (user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists research_sessions_set_updated_at on public.research_sessions;
create trigger research_sessions_set_updated_at
  before update on public.research_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists saved_opportunities_set_updated_at on public.saved_opportunities;
create trigger saved_opportunities_set_updated_at
  before update on public.saved_opportunities
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, freelancer_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'freelancer_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.research_sessions enable row level security;
alter table public.saved_opportunities enable row level security;

-- Profiles policies
drop policy if exists "Profiles select own" on public.profiles;
create policy "Profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Services policies
drop policy if exists "Services select own" on public.services;
create policy "Services select own"
  on public.services for select
  using (auth.uid() = user_id);

drop policy if exists "Services insert own" on public.services;
create policy "Services insert own"
  on public.services for insert
  with check (auth.uid() = user_id);

drop policy if exists "Services update own" on public.services;
create policy "Services update own"
  on public.services for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Services delete own" on public.services;
create policy "Services delete own"
  on public.services for delete
  using (auth.uid() = user_id);

-- Research sessions policies
drop policy if exists "Research select own" on public.research_sessions;
create policy "Research select own"
  on public.research_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Research insert own" on public.research_sessions;
create policy "Research insert own"
  on public.research_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Research update own" on public.research_sessions;
create policy "Research update own"
  on public.research_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Research delete own" on public.research_sessions;
create policy "Research delete own"
  on public.research_sessions for delete
  using (auth.uid() = user_id);

-- Saved opportunities policies
drop policy if exists "Opportunities select own" on public.saved_opportunities;
create policy "Opportunities select own"
  on public.saved_opportunities for select
  using (auth.uid() = user_id);

drop policy if exists "Opportunities insert own" on public.saved_opportunities;
create policy "Opportunities insert own"
  on public.saved_opportunities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Opportunities update own" on public.saved_opportunities;
create policy "Opportunities update own"
  on public.saved_opportunities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Opportunities delete own" on public.saved_opportunities;
create policy "Opportunities delete own"
  on public.saved_opportunities for delete
  using (auth.uid() = user_id);
