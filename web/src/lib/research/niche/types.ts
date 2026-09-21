import type {
  ConfidenceLevel,
  EvidenceKind,
} from "@/lib/research/types";

export type ResearchDepth = "quick" | "standard" | "deep";

export type NicheTagType =
  | "problem"
  | "tool"
  | "platform"
  | "integration"
  | "feature"
  | "buyer_intent"
  | "use_case"
  | "technical"
  | "outcome"
  | "long_tail"
  | "service";

export type DemandEvidenceKind =
  | "direct_marketplace"
  | "public_problem"
  | "indirect_demand"
  | "ai_inference";

export type NicheSignalLevel =
  | "stronger_niche_signal"
  | "moderate_niche_signal"
  | "weak_niche_signal"
  | "insufficient_evidence";

export type NicheTag = {
  tag: string;
  type: NicheTagType;
  parentConcept: string;
  relatedProblem?: string;
  relatedTool?: string;
  buyerIntent?: string;
  evidenceIds: string[];
  confidence: ConfidenceLevel;
  reasonItMatters: string;
  researched: boolean;
  tooGeneric: boolean;
};

export type TagRelationship = {
  from: string;
  to: string;
  reason: string;
  sharedConcept: "problem" | "tool" | "outcome" | "buyer" | "service";
};

export type CompetitionSignal = {
  level: NicheSignalLevel;
  why: string;
  observedListingCount: number;
  notes: string[];
};

export type DemandEvidence = {
  kind: DemandEvidenceKind;
  summary: string;
  evidenceIds: string[];
};

export type ProblemDepth = {
  problem: string;
  who: string;
  toolPlatform: string;
  whyTheyNeedHelp: string;
  desiredOutcome: string;
  serviceRequired: string;
  evidence: string;
  opportunity: string;
  confidence: ConfidenceLevel;
  kind: EvidenceKind;
  evidenceIds: string[];
};

export type MicroNicheOpportunity = {
  id: string;
  title: string;
  buyer: string;
  problem: string;
  toolPlatform: string;
  service: string;
  desiredOutcome: string;
  positioning: string;
  tagCluster: string[];
  whyTagsBelongTogether: string;
  sharedBuyerIntent: string;
  competition: CompetitionSignal;
  demandEvidence: DemandEvidence[];
  problemDepth: ProblemDepth;
  confidence: ConfidenceLevel;
  evidenceIds: string[];
};

export type SourceTrace = {
  id: string;
  source: string;
  sourceType: string;
  url?: string;
  researchedAt: string;
  observed: string;
  interpretation?: string;
};
