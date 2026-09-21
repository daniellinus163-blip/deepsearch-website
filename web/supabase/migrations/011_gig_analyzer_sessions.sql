-- Gig Analyzer sessions: URL → snapshot → audit → deep research → optimized gig

create table if not exists public.gig_analyzer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_url text not null,
  snapshot jsonb not null default '{}'::jsonb,
  audit jsonb not null default '{}'::jsonb,
  research_query text,
  deep_result jsonb,
  deep_report jsonb,
  optimized_gig jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'audited', 'deep_researched', 'optimized', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gig_analyzer_sessions_user_id_idx
  on public.gig_analyzer_sessions (user_id);

create index if not exists gig_analyzer_sessions_source_url_idx
  on public.gig_analyzer_sessions (source_url);

drop trigger if exists gig_analyzer_sessions_set_updated_at on public.gig_analyzer_sessions;
create trigger gig_analyzer_sessions_set_updated_at
  before update on public.gig_analyzer_sessions
  for each row execute function public.set_updated_at();

alter table public.gig_analyzer_sessions enable row level security;

drop policy if exists "Gig analyzer select own" on public.gig_analyzer_sessions;
create policy "Gig analyzer select own"
  on public.gig_analyzer_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Gig analyzer insert own" on public.gig_analyzer_sessions;
create policy "Gig analyzer insert own"
  on public.gig_analyzer_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Gig analyzer update own" on public.gig_analyzer_sessions;
create policy "Gig analyzer update own"
  on public.gig_analyzer_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Gig analyzer delete own" on public.gig_analyzer_sessions;
create policy "Gig analyzer delete own"
  on public.gig_analyzer_sessions for delete
  using (auth.uid() = user_id);
