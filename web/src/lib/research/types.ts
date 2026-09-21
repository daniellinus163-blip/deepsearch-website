import type {
  MicroNicheOpportunity,
  NicheTag,
  ProblemDepth,
  ResearchDepth,
  SourceTrace,
  TagRelationship,
} from "@/lib/research/niche/types";

export type EvidenceKind =
  | "observed"
  | "inferred"
  | "ai_interpretation"
  | "opportunity_hypothesis"
  | "curated_knowledge";

export type ConfidenceLevel =
  | "strong"
  | "moderate"
  | "weak"
  | "hypothesis"
  | "insufficient";

export type ResearchEvidence = {
  id: string;
  source: string;
  kind: EvidenceKind;
  confidence: ConfidenceLevel;
  snippet: string;
  url?: string;
  collectedAt: string;
};

export type Finding = {
  label: string;
  why: string;
  evidenceIds: string[];
  confidence: ConfidenceLevel;
  kind: EvidenceKind;
};

export type RelatedTerms = {
  broad: Finding[];
  specific: Finding[];
  longTail: Finding[];
  buyerIntent: Finding[];
};

export type SearchTermEntry = {
  term: string;
  type:
    | "starting"
    | "core"
    | "primary"
    | "secondary"
    | "long_tail"
    | "buyer_intent"
    | "problem"
    | "outcome"
    | "feature"
    | "audience";
  relationship: string;
  why: string;
  evidenceIds: string[];
  confidence: ConfidenceLevel;
};

export type BuyerNeedExplanation = {
  buyerNeed: string;
  problem: string;
  desiredOutcome: string;
  evidence: string;
  opportunity: string;
  whyItMatters: string;
  confidence: ConfidenceLevel;
  kind: EvidenceKind;
};

export type DeepResearchReport = {
  query: string;
  coreService: string;
  marketplaces: string[];
  researchDepth: ResearchDepth;
  serviceUnderstanding: string;
  serviceBranches: Finding[];
  buyerTypes: Finding[];
  useCases: Finding[];
  buyerProblems: Finding[];
  features: Finding[];
  relatedTerms: RelatedTerms;
  searchTermHierarchy: SearchTermEntry[];
  whyBuyersNeed: BuyerNeedExplanation[];
  problemDepths: ProblemDepth[];
  nicheTagPool: NicheTag[];
  tagRelationships: TagRelationship[];
  microNiches: MicroNicheOpportunity[];
  discoveredTools: Finding[];
  rootNeeds: Finding[];
  nonObvious: Finding[];
  opportunitySignals: Finding[];
  opportunityGaps: Finding[];
  competitorObservations: Finding[];
  recommendedPositioning: Finding[];
  evidence: ResearchEvidence[];
  sourceTraces: SourceTrace[];
  insufficientNotes: string[];
  researchedAt: string;
  adaptersUsed: string[];
  reasoningProvider: string;
  fiverrLimitationNote: string;
};

export type CollectedDocument = {
  adapter: string;
  title: string;
  url?: string;
  text: string;
  kind: EvidenceKind;
  meta?: Record<string, unknown>;
};

export type SearchAdapter = {
  id: string;
  search(query: string, context?: ResearchContext): Promise<CollectedDocument[]>;
};

export type ResearchContext = {
  userId?: string | null;
  normalizedQuery: string;
  followUpTerms?: string[];
  marketplaces?: string[];
  researchDepth?: ResearchDepth;
};

export type ResearchProgressEvent = {
  stage: string;
  detail: string;
};

export type {
  MicroNicheOpportunity,
  NicheTag,
  ProblemDepth,
  ResearchDepth,
  SourceTrace,
  TagRelationship,
};
