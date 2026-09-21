-- Niche research entities linked to deep research reports / gig drafts

create table if not exists public.niche_research_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  research_report_id uuid references public.deep_research_reports (id) on delete cascade,
  tag text not null,
  tag_type text not null default 'service',
  parent_concept text,
  related_problem text,
  related_tool text,
  buyer_intent text,
  confidence text,
  reason text,
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists niche_research_tags_report_idx
  on public.niche_research_tags (research_report_id);

create table if not exists public.micro_niche_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  research_report_id uuid references public.deep_research_reports (id) on delete cascade,
  niche_key text not null,
  title text not null,
  buyer text,
  problem text,
  tool_platform text,
  service text,
  desired_outcome text,
  positioning text,
  tag_cluster text[] not null default '{}',
  competition_level text,
  competition_why text,
  demand_evidence jsonb not null default '[]'::jsonb,
  problem_depth jsonb not null default '{}'::jsonb,
  confidence text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists micro_niche_opportunities_report_idx
  on public.micro_niche_opportunities (research_report_id);

alter table public.deep_research_reports
  add column if not exists research_depth text not null default 'standard';

alter table public.gig_drafts
  add column if not exists micro_niche_key text;

alter table public.gig_drafts
  add column if not exists tag_cluster text[] not null default '{}';

alter table public.niche_research_tags enable row level security;
alter table public.micro_niche_opportunities enable row level security;

drop policy if exists "Niche tags select own" on public.niche_research_tags;
create policy "Niche tags select own"
  on public.niche_research_tags for select
  using (auth.uid() = user_id OR user_id is null);

drop policy if exists "Niche tags insert own" on public.niche_research_tags;
create policy "Niche tags insert own"
  on public.niche_research_tags for insert
  with check (auth.uid() = user_id OR user_id is null);

drop policy if exists "Micro niches select own" on public.micro_niche_opportunities;
create policy "Micro niches select own"
  on public.micro_niche_opportunities for select
  using (auth.uid() = user_id OR user_id is null);

drop policy if exists "Micro niches insert own" on public.micro_niche_opportunities;
create policy "Micro niches insert own"
  on public.micro_niche_opportunities for insert
  with check (auth.uid() = user_id OR user_id is null);
