-- Phase 6: Buyer Intent Engine
-- Classifies what a buyer actually wants from a search/service term (rule-based).

create table if not exists public.buyer_intent_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  keyword_id uuid references public.keywords (id) on delete set null,
  term text not null,
  primary_category text not null
    check (primary_category in (
      'general',
      'specific_service',
      'feature',
      'use_case',
      'problem',
      'audience',
      'outcome',
      'purchase_ready'
    )),
  categories text[] not null default '{}',
  audience text,
  use_case text,
  service_label text,
  intent_label text not null default 'exploratory',
  problem text,
  outcome text,
  confidence numeric not null default 0
    check (confidence >= 0 and confidence <= 1),
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_id, term)
);

create index if not exists buyer_intent_analyses_user_id_idx
  on public.buyer_intent_analyses (user_id);
create index if not exists buyer_intent_analyses_service_id_idx
  on public.buyer_intent_analyses (service_id);

drop trigger if exists buyer_intent_analyses_set_updated_at on public.buyer_intent_analyses;
create trigger buyer_intent_analyses_set_updated_at
  before update on public.buyer_intent_analyses
  for each row execute function public.set_updated_at();

alter table public.buyer_intent_analyses enable row level security;

drop policy if exists "Intent select own" on public.buyer_intent_analyses;
create policy "Intent select own"
  on public.buyer_intent_analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Intent insert own" on public.buyer_intent_analyses;
create policy "Intent insert own"
  on public.buyer_intent_analyses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Intent update own" on public.buyer_intent_analyses;
create policy "Intent update own"
  on public.buyer_intent_analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Intent delete own" on public.buyer_intent_analyses;
create policy "Intent delete own"
  on public.buyer_intent_analyses for delete
  using (auth.uid() = user_id);
