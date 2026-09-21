export type GigSnapshot = {
  sourceUrl: string;
  retrievedAt: string;
  retrievalStatus: "full" | "partial" | "unavailable" | "from_saved_listing" | "manual_paste";
  retrievalNotes: string[];
  title: string | null;
  description: string | null;
  tags: string[];
  category: string | null;
  subcategory: string | null;
  packages: Array<{
    name?: string;
    priceText?: string;
    deliveryTime?: string;
    summary?: string;
    revisions?: string;
  }>;
  pricingText: string | null;
  deliveryTime: string | null;
  revisionsText: string | null;
  faqs: Array<{ question?: string; answer?: string }>;
  requirements: string[];
  sellerName: string | null;
  sellerLevel: string | null;
  reviewsCount: number | null;
  rating: number | null;
  reviewLanguage: string[];
  rawExcerpt: string | null;
  listingId: string | null;
};

export type AuditDimension = {
  id: string;
  label: string;
  assessment: string;
  evidence: string;
  opportunity?: string;
};

export type TagAuditItem = {
  tag: string;
  meaning: string;
  relationToService: string;
  buyerIntent: string;
  breadth: "broad" | "specific" | "unclear";
  relatedTerms: string[];
};

export type BoostTagKind =
  | "tool"
  | "problem"
  | "buyer_need"
  | "style"
  | "service";

export type BoostTag = {
  tag: string;
  kind: BoostTagKind;
  why: string;
  alreadyOnGig: boolean;
};

export type GigAuditReport = {
  overview: string;
  targetBuyer: string;
  mainProblem: string;
  desiredOutcome: string;
  serviceStructure: string;
  titleAnalysis: string;
  tagAnalysis: TagAuditItem[];
  /** Up to 10 suggested Fiverr tags to add for potential boost */
  suggestedBoostTags: BoostTag[];
  descriptionAnalysis: string;
  packageAnalysis: string;
  faqAnalysis: string;
  requirementsAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  potentialOpportunities: string[];
  areasForDeeperResearch: string[];
  dimensions: AuditDimension[];
  confidenceNotes: string[];
  provider: string;
};

export type MissingResearchItem = {
  category:
    | "buyer_need"
    | "problem"
    | "tool"
    | "use_case"
    | "search_concept"
    | "buyer_question"
    | "positioning";
  item: string;
  why: string;
  evidence: string;
};

export type OptimizedChange = {
  area: string;
  original: string;
  changedTo: string;
  reason: string;
  evidence: string;
};

export type TagCluster = {
  name: string;
  tags: string[];
  sharedBuyerIntent: string;
  whyTogether: string;
};

export type AnalyzerDeepResult = {
  researchQuery: string;
  deepReport: unknown;
  missing: MissingResearchItem[];
  tagClusters: TagCluster[];
  competitorPatterns: string[];
  confidenceSummary: string;
};

export type OptimizedGigBundle = {
  title: string;
  description: string;
  tags: string[];
  packages: Array<{ name: string; summary: string; includes: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  requirements: string[];
  changes: OptimizedChange[];
  provider: string;
};
