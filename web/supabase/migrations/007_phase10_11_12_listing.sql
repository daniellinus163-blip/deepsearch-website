-- Phases 10–12: Positioning, Gig Builder, Gig Health Analyzer

create table if not exists public.service_positionings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  target_buyer text not null,
  problem text not null,
  desired_result text not null,
  service_offer text not null,
  differentiator text not null,
  positioning_statement text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_id)
);

create table if not exists public.gig_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  title text not null,
  title_why text,
  tags text[] not null default '{}',
  tags_why text,
  description text not null,
  description_why text,
  packages jsonb not null default '[]'::jsonb,
  packages_why text,
  faqs jsonb not null default '[]'::jsonb,
  faqs_why text,
  requirements text[] not null default '{}',
  requirements_why text,
  delivery_structure text,
  delivery_why text,
  buyer_positioning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_id)
);

create table if not exists public.gig_health_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  source_title text,
  source_description text,
  source_tags text[] not null default '{}',
  source_packages text,
  source_faq text,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gig_health_reports_user_id_idx
  on public.gig_health_reports (user_id);
create index if not exists gig_health_reports_service_id_idx
  on public.gig_health_reports (service_id);

drop trigger if exists service_positionings_set_updated_at on public.service_positionings;
create trigger service_positionings_set_updated_at
  before update on public.service_positionings
  for each row execute function public.set_updated_at();

drop trigger if exists gig_drafts_set_updated_at on public.gig_drafts;
create trigger gig_drafts_set_updated_at
  before update on public.gig_drafts
  for each row execute function public.set_updated_at();

drop trigger if exists gig_health_reports_set_updated_at on public.gig_health_reports;
create trigger gig_health_reports_set_updated_at
  before update on public.gig_health_reports
  for each row execute function public.set_updated_at();

alter table public.service_positionings enable row level security;
alter table public.gig_drafts enable row level security;
alter table public.gig_health_reports enable row level security;

drop policy if exists "Positionings select own" on public.service_positionings;
create policy "Positionings select own" on public.service_positionings for select using (auth.uid() = user_id);
drop policy if exists "Positionings insert own" on public.service_positionings;
create policy "Positionings insert own" on public.service_positionings for insert with check (auth.uid() = user_id);
drop policy if exists "Positionings update own" on public.service_positionings;
create policy "Positionings update own" on public.service_positionings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Positionings delete own" on public.service_positionings;
create policy "Positionings delete own" on public.service_positionings for delete using (auth.uid() = user_id);

drop policy if exists "Gig drafts select own" on public.gig_drafts;
create policy "Gig drafts select own" on public.gig_drafts for select using (auth.uid() = user_id);
drop policy if exists "Gig drafts insert own" on public.gig_drafts;
create policy "Gig drafts insert own" on public.gig_drafts for insert with check (auth.uid() = user_id);
drop policy if exists "Gig drafts update own" on public.gig_drafts;
create policy "Gig drafts update own" on public.gig_drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Gig drafts delete own" on public.gig_drafts;
create policy "Gig drafts delete own" on public.gig_drafts for delete using (auth.uid() = user_id);

drop policy if exists "Gig health select own" on public.gig_health_reports;
create policy "Gig health select own" on public.gig_health_reports for select using (auth.uid() = user_id);
drop policy if exists "Gig health insert own" on public.gig_health_reports;
create policy "Gig health insert own" on public.gig_health_reports for insert with check (auth.uid() = user_id);
drop policy if exists "Gig health update own" on public.gig_health_reports;
create policy "Gig health update own" on public.gig_health_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Gig health delete own" on public.gig_health_reports;
create policy "Gig health delete own" on public.gig_health_reports for delete using (auth.uid() = user_id);
