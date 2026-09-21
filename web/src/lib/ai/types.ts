/**
 * Shared AI reasoning types for DeepSearch.
 * Providers (Gemini, OpenAI, …) implement the same contract.
 * They interpret collected evidence only — never invent marketplace stats.
 */

export type ReasoningItem = {
  label: string;
  why?: string;
};

export type ReasoningInput = {
  query: string;
  evidenceText: string;
};

export type ReasoningResult = {
  used: boolean;
  provider: string;
  notes: string[];
  serviceUnderstanding?: string;
  suggestedBranches?: ReasoningItem[];
  suggestedBuyerTypes?: ReasoningItem[];
  suggestedUseCases?: ReasoningItem[];
  suggestedProblems?: ReasoningItem[];
  suggestedFeatures?: ReasoningItem[];
  buyerIntent?: ReasoningItem[];
  searchPhrases?: ReasoningItem[];
  longTailOpportunities?: ReasoningItem[];
  recurringBuyerLanguage?: ReasoningItem[];
  competitorPositioning?: ReasoningItem[];
  underservedAreas?: ReasoningItem[];
  opportunityGaps?: ReasoningItem[];
  rootNeeds?: ReasoningItem[];
  recommendedPositioning?: ReasoningItem[];
  nonObvious?: ReasoningItem[];
  followUpTerms?: string[];
};

export type ReasoningProvider = {
  id: string;
  isConfigured(): boolean;
  analyzeEvidence(input: ReasoningInput): Promise<ReasoningResult>;
};
