export const MARKETPLACES = [
  "Fiverr",
  "Upwork",
  "Freelancer",
  "Contra",
] as const;

export type Marketplace = (typeof MARKETPLACES)[number];

export type Profile = {
  id: string;
  freelancer_name: string | null;
  email: string | null;
  marketplaces: string[];
  skills: string[];
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceDiscovery = {
  id: string;
  user_id: string;
  service_id: string;
  source_query: string;
  main_service: string;
  category: string;
  sub_services: string[];
  buyer_types: string[];
  use_cases: string[];
  matched_catalog: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchSession = {
  id: string;
  user_id: string;
  service_id: string | null;
  title: string;
  query: string | null;
  status: "draft" | "in_progress" | "completed" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedOpportunity = {
  id: string;
  user_id: string;
  service_id: string | null;
  research_session_id: string | null;
  title: string;
  summary: string | null;
  marketplace: string | null;
  buyer_intent: string | null;
  competition_signal: string | null;
  specificity: string | null;
  service_fit: string | null;
  why_identified: string | null;
  demand_signal: string | null;
  gap_score: number | null;
  created_at: string;
  updated_at: string;
};

export type MarketplaceListing = {
  id: string;
  user_id: string;
  research_session_id: string | null;
  service_id: string | null;
  marketplace: string;
  page_type: "gig" | "search" | "seller" | "other";
  source_url: string;
  title: string | null;
  category: string | null;
  tags: string[];
  description: string | null;
  price_text: string | null;
  price_amount: number | null;
  currency: string | null;
  reviews_count: number | null;
  rating: number | null;
  seller_name: string | null;
  seller_level: string | null;
  delivery_time: string | null;
  packages: unknown[];
  faq: unknown[];
  raw_observable: Record<string, unknown>;
  extracted_at: string;
  created_at: string;
  updated_at: string;
};

export type KeywordSet = {
  id: string;
  user_id: string;
  service_id: string | null;
  research_session_id: string | null;
  source_text: string;
  created_at: string;
  updated_at: string;
};

export type Keyword = {
  id: string;
  keyword_set_id: string;
  user_id: string;
  term: string;
  level: "core" | "primary" | "secondary" | "long_tail" | "buyer_intent";
  parent_term: string | null;
  relevance: number;
  specificity: number;
  competition_signal: number;
  buyer_intent: string;
  relationship_to_service: string;
  sort_order: number;
  created_at: string;
};

export type BuyerIntentAnalysis = {
  id: string;
  user_id: string;
  service_id: string;
  keyword_id: string | null;
  term: string;
  primary_category:
    | "general"
    | "specific_service"
    | "feature"
    | "use_case"
    | "problem"
    | "audience"
    | "outcome"
    | "purchase_ready";
  categories: string[];
  audience: string | null;
  use_case: string | null;
  service_label: string | null;
  intent_label: string;
  problem: string | null;
  outcome: string | null;
  confidence: number;
  signals: string[];
  created_at: string;
  updated_at: string;
};

export type RootNeedAnalysis = {
  id: string;
  user_id: string;
  service_id: string;
  keyword_id: string | null;
  intent_analysis_id: string | null;
  term: string;
  buyer_intent: string | null;
  buyer_problem: string | null;
  root_need: string | null;
  desired_outcome: string | null;
  what_text: string | null;
  why_text: string | null;
  where_text: string | null;
  who_text: string | null;
  created_at: string;
  updated_at: string;
};

export type CompetitionReport = {
  id: string;
  user_id: string;
  service_id: string;
  listings_analyzed: number;
  common_positioning: string[];
  common_price_min: number | null;
  common_price_max: number | null;
  common_price_avg: number | null;
  currency: string | null;
  common_delivery: string[];
  repeated_buyer_language: string[];
  missing_positioning: string[];
  competition_signal: number;
  summary: string | null;
  raw_metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ServicePositioning = {
  id: string;
  user_id: string;
  service_id: string;
  target_buyer: string;
  problem: string;
  desired_result: string;
  service_offer: string;
  differentiator: string;
  positioning_statement: string;
  created_at: string;
  updated_at: string;
};

export type GigDraft = {
  id: string;
  user_id: string;
  service_id: string;
  title: string;
  title_why: string | null;
  tags: string[];
  tags_why: string | null;
  description: string;
  description_why: string | null;
  packages: unknown[];
  packages_why: string | null;
  faqs: unknown[];
  faqs_why: string | null;
  requirements: string[];
  requirements_why: string | null;
  delivery_structure: string | null;
  delivery_why: string | null;
  buyer_positioning: string | null;
  research_report_id?: string | null;
  research_trace?: Record<string, unknown>;
  marketplace?: string | null;
  created_at: string;
  updated_at: string;
};

export type GigHealthReport = {
  id: string;
  user_id: string;
  service_id: string | null;
  source_title: string | null;
  source_description: string | null;
  source_tags: string[];
  source_packages: string | null;
  source_faq: string | null;
  findings: Array<{
    section: string;
    check: string;
    status: string;
    finding: string;
    fix: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type WorkspaceSummary = {
  profile: Profile | null;
  services: Service[];
  researchCount: number;
  opportunityCount: number;
};
