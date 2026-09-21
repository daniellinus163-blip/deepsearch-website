export const INTENT_CATEGORIES = [
  "general",
  "specific_service",
  "feature",
  "use_case",
  "problem",
  "audience",
  "outcome",
  "purchase_ready",
] as const;

export type IntentCategory = (typeof INTENT_CATEGORIES)[number];

export const INTENT_CATEGORY_LABELS: Record<IntentCategory, string> = {
  general: "General",
  specific_service: "Specific service",
  feature: "Feature",
  use_case: "Use case",
  problem: "Problem",
  audience: "Audience",
  outcome: "Outcome",
  purchase_ready: "Purchase-ready",
};

export type IntentClassifyContext = {
  mainService?: string | null;
  category?: string | null;
  subServices?: string[];
  buyerTypes?: string[];
  useCases?: string[];
};

export type IntentClassification = {
  term: string;
  primaryCategory: IntentCategory;
  categories: IntentCategory[];
  audience: string | null;
  useCase: string | null;
  serviceLabel: string | null;
  intentLabel: string;
  problem: string | null;
  outcome: string | null;
  confidence: number;
  signals: string[];
};
