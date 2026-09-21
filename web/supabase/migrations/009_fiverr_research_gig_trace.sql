-- Link gig drafts to deep research; store marketplace + research trace

alter table public.deep_research_reports
  add column if not exists marketplaces text[] not null default '{}';

alter table public.gig_drafts
  add column if not exists research_report_id uuid
    references public.deep_research_reports (id) on delete set null;

alter table public.gig_drafts
  add column if not exists research_trace jsonb not null default '{}'::jsonb;

alter table public.gig_drafts
  add column if not exists marketplace text;

create index if not exists gig_drafts_research_report_id_idx
  on public.gig_drafts (research_report_id);
