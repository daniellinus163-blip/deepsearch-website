-- Deep Research Engine: evidence-based research reports

create table if not exists public.deep_research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  source_query text not null,
  core_service text,
  report jsonb not null default '{}'::jsonb,
  evidence_count integer not null default 0,
  confidence_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deep_research_reports_user_id_idx
  on public.deep_research_reports (user_id);
create index if not exists deep_research_reports_service_id_idx
  on public.deep_research_reports (service_id);

drop trigger if exists deep_research_reports_set_updated_at on public.deep_research_reports;
create trigger deep_research_reports_set_updated_at
  before update on public.deep_research_reports
  for each row execute function public.set_updated_at();

alter table public.deep_research_reports enable row level security;

drop policy if exists "Deep research select own" on public.deep_research_reports;
create policy "Deep research select own"
  on public.deep_research_reports for select
  using (auth.uid() = user_id OR user_id is null);

drop policy if exists "Deep research insert own" on public.deep_research_reports;
create policy "Deep research insert own"
  on public.deep_research_reports for insert
  with check (auth.uid() = user_id OR user_id is null);

drop policy if exists "Deep research update own" on public.deep_research_reports;
create policy "Deep research update own"
  on public.deep_research_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Deep research delete own" on public.deep_research_reports;
create policy "Deep research delete own"
  on public.deep_research_reports for delete
  using (auth.uid() = user_id);
