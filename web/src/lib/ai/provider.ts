import { geminiProvider } from "@/lib/ai/gemini";
import { openaiProvider } from "@/lib/ai/openai";
import type {
  ReasoningInput,
  ReasoningProvider,
  ReasoningResult,
} from "@/lib/ai/types";

/**
 * Modular AI provider registry.
 * Prefer Gemini (GEMINI_API_KEY). Fall back to OpenAI if configured.
 * Never expose keys to the client or extension.
 */
export function getReasoningProviders(): ReasoningProvider[] {
  return [geminiProvider, openaiProvider];
}

export function getActiveReasoningProvider(): ReasoningProvider | null {
  for (const provider of getReasoningProviders()) {
    if (provider.isConfigured()) return provider;
  }
  return null;
}

export async function analyzeEvidenceWithAI(
  input: ReasoningInput
): Promise<ReasoningResult> {
  const preferred =
    process.env.DEEPSEARCH_AI_PROVIDER?.trim().toLowerCase() || "gemini";

  const providers = getReasoningProviders();
  const ordered =
    preferred === "openai"
      ? [
          ...providers.filter((p) => p.id === "openai"),
          ...providers.filter((p) => p.id !== "openai"),
        ]
      : [
          ...providers.filter((p) => p.id === "gemini"),
          ...providers.filter((p) => p.id !== "gemini"),
        ];

  for (const provider of ordered) {
    if (!provider.isConfigured()) continue;
    const result = await provider.analyzeEvidence(input);
    if (result.used) return result;
    // If configured but failed, try next provider
    if (result.notes.length && ordered.indexOf(provider) < ordered.length - 1) {
      const next = ordered
        .slice(ordered.indexOf(provider) + 1)
        .find((p) => p.isConfigured());
      if (next) {
        const fallback = await next.analyzeEvidence(input);
        if (fallback.used) {
          return {
            ...fallback,
            notes: [
              ...result.notes,
              `Fell back to ${fallback.provider}.`,
              ...fallback.notes,
            ],
          };
        }
        return {
          used: false,
          provider: provider.id,
          notes: [...result.notes, ...fallback.notes],
        };
      }
    }
    return result;
  }

  return {
    used: false,
    provider: "none",
    notes: [
      "No AI reasoning provider configured. Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY in server env. Evidence adapters still run.",
    ],
  };
}
