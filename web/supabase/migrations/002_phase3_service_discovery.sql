-- Phase 3: Service Discovery Engine storage
-- Rule-based discovery profiles linked to services (no AI).

create table if not exists public.service_discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null unique references public.services (id) on delete cascade,
  source_query text not null,
  main_service text not null,
  category text not null,
  sub_services text[] not null default '{}',
  buyer_types text[] not null default '{}',
  use_cases text[] not null default '{}',
  matched_catalog text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_discoveries_user_id_idx
  on public.service_discoveries (user_id);

drop trigger if exists service_discoveries_set_updated_at on public.service_discoveries;
create trigger service_discoveries_set_updated_at
  before update on public.service_discoveries
  for each row execute function public.set_updated_at();

alter table public.service_discoveries enable row level security;

drop policy if exists "Discoveries select own" on public.service_discoveries;
create policy "Discoveries select own"
  on public.service_discoveries for select
  using (auth.uid() = user_id);

drop policy if exists "Discoveries insert own" on public.service_discoveries;
create policy "Discoveries insert own"
  on public.service_discoveries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Discoveries update own" on public.service_discoveries;
create policy "Discoveries update own"
  on public.service_discoveries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Discoveries delete own" on public.service_discoveries;
create policy "Discoveries delete own"
  on public.service_discoveries for delete
  using (auth.uid() = user_id);
