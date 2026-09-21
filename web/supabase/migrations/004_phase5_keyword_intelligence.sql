-- Phase 5: Search & Keyword Intelligence
-- Hierarchical keywords with attributes (rule-based, not official marketplace scores).

create table if not exists public.keyword_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete cascade,
  research_session_id uuid references public.research_sessions (id) on delete set null,
  source_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists keyword_sets_user_id_idx on public.keyword_sets (user_id);
create index if not exists keyword_sets_service_id_idx on public.keyword_sets (service_id);

create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  keyword_set_id uuid not null references public.keyword_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  level text not null
    check (level in ('core', 'primary', 'secondary', 'long_tail', 'buyer_intent')),
  parent_term text,
  relevance numeric not null default 0
    check (relevance >= 0 and relevance <= 1),
  specificity numeric not null default 0
    check (specificity >= 0 and specificity <= 1),
  competition_signal numeric not null default 0
    check (competition_signal >= 0 and competition_signal <= 1),
  buyer_intent text not null default 'general',
  relationship_to_service text not null default 'related',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists keywords_set_id_idx on public.keywords (keyword_set_id);
create index if not exists keywords_user_id_idx on public.keywords (user_id);

drop trigger if exists keyword_sets_set_updated_at on public.keyword_sets;
create trigger keyword_sets_set_updated_at
  before update on public.keyword_sets
  for each row execute function public.set_updated_at();

alter table public.keyword_sets enable row level security;
alter table public.keywords enable row level security;

drop policy if exists "Keyword sets select own" on public.keyword_sets;
create policy "Keyword sets select own"
  on public.keyword_sets for select using (auth.uid() = user_id);

drop policy if exists "Keyword sets insert own" on public.keyword_sets;
create policy "Keyword sets insert own"
  on public.keyword_sets for insert with check (auth.uid() = user_id);

drop policy if exists "Keyword sets update own" on public.keyword_sets;
create policy "Keyword sets update own"
  on public.keyword_sets for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Keyword sets delete own" on public.keyword_sets;
create policy "Keyword sets delete own"
  on public.keyword_sets for delete using (auth.uid() = user_id);

drop policy if exists "Keywords select own" on public.keywords;
create policy "Keywords select own"
  on public.keywords for select using (auth.uid() = user_id);

drop policy if exists "Keywords insert own" on public.keywords;
create policy "Keywords insert own"
  on public.keywords for insert with check (auth.uid() = user_id);

drop policy if exists "Keywords update own" on public.keywords;
create policy "Keywords update own"
  on public.keywords for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Keywords delete own" on public.keywords;
create policy "Keywords delete own"
  on public.keywords for delete using (auth.uid() = user_id);
