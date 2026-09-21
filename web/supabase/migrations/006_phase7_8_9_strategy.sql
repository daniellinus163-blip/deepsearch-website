-- Phases 7–9: Root Need, Competition Intelligence, Opportunity Gaps

-- Phase 7
create table if not exists public.root_need_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  keyword_id uuid references public.keywords (id) on delete set null,
  intent_analysis_id uuid references public.buyer_intent_analyses (id) on delete set null,
  term text not null,
  buyer_intent text,
  buyer_problem text,
  root_need text,
  desired_outcome text,
  what_text text,
  why_text text,
  where_text text,
  who_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_id, term)
);

create index if not exists root_need_analyses_service_id_idx
  on public.root_need_analyses (service_id);

-- Phase 8
create table if not exists public.competition_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  listings_analyzed integer not null default 0,
  common_positioning text[] not null default '{}',
  common_price_min numeric,
  common_price_max numeric,
  common_price_avg numeric,
  currency text,
  common_delivery text[] not null default '{}',
  repeated_buyer_language text[] not null default '{}',
  missing_positioning text[] not null default '{}',
  competition_signal numeric not null default 0
    check (competition_signal >= 0 and competition_signal <= 1),
  summary text,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competition_reports_service_id_idx
  on public.competition_reports (service_id);

-- Phase 9: enrich saved opportunities
alter table public.saved_opportunities
  add column if not exists specificity text,
  add column if not exists service_fit text,
  add column if not exists why_identified text,
  add column if not exists demand_signal text,
  add column if not exists gap_score numeric;

drop trigger if exists root_need_analyses_set_updated_at on public.root_need_analyses;
create trigger root_need_analyses_set_updated_at
  before update on public.root_need_analyses
  for each row execute function public.set_updated_at();

drop trigger if exists competition_reports_set_updated_at on public.competition_reports;
create trigger competition_reports_set_updated_at
  before update on public.competition_reports
  for each row execute function public.set_updated_at();

alter table public.root_need_analyses enable row level security;
alter table public.competition_reports enable row level security;

drop policy if exists "Root need select own" on public.root_need_analyses;
create policy "Root need select own" on public.root_need_analyses
  for select using (auth.uid() = user_id);
drop policy if exists "Root need insert own" on public.root_need_analyses;
create policy "Root need insert own" on public.root_need_analyses
  for insert with check (auth.uid() = user_id);
drop policy if exists "Root need update own" on public.root_need_analyses;
create policy "Root need update own" on public.root_need_analyses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Root need delete own" on public.root_need_analyses;
create policy "Root need delete own" on public.root_need_analyses
  for delete using (auth.uid() = user_id);

drop policy if exists "Competition select own" on public.competition_reports;
create policy "Competition select own" on public.competition_reports
  for select using (auth.uid() = user_id);
drop policy if exists "Competition insert own" on public.competition_reports;
create policy "Competition insert own" on public.competition_reports
  for insert with check (auth.uid() = user_id);
drop policy if exists "Competition update own" on public.competition_reports;
create policy "Competition update own" on public.competition_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Competition delete own" on public.competition_reports;
create policy "Competition delete own" on public.competition_reports
  for delete using (auth.uid() = user_id);
