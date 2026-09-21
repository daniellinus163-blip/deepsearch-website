/**
 * Backward-compatible re-export.
 * Prefer @/lib/ai/provider or @/lib/ai/openai for new code.
 */
export {
  analyzeWithOpenAI as synthesizeWithOpenAI,
  isOpenAIConfigured,
} from "@/lib/ai/openai";
export type {
  ReasoningInput as OpenAISynthesisInput,
  ReasoningResult as OpenAISynthesisResult,
} from "@/lib/ai/types";
