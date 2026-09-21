import type {
  ReasoningInput,
  ReasoningItem,
  ReasoningProvider,
  ReasoningResult,
} from "@/lib/ai/types";

/**
 * Optional OpenAI reasoning provider (alternate to Gemini).
 * Server-side only — OPENAI_API_KEY never goes to the client/extension.
 */

function asItems(value: unknown): ReasoningItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: ReasoningItem[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) {
      items.push({ label: entry.trim() });
    } else if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { label?: unknown }).label === "string"
    ) {
      const label = String((entry as { label: string }).label).trim();
      if (!label) continue;
      const why =
        typeof (entry as { why?: unknown }).why === "string"
          ? String((entry as { why: string }).why).trim()
          : undefined;
      items.push({ label, why });
    }
  }
  return items.length ? items : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function analyzeWithOpenAI(
  input: ReasoningInput
): Promise<ReasoningResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      used: false,
      provider: "openai",
      notes: [
        "OpenAI not configured (OPENAI_API_KEY missing).",
      ],
    };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a DeepSearch research analyst. ONLY interpret provided evidence.
Never invent Fiverr volumes, rankings, or private marketplace data.
Never suggest basic/premium/with revisions/cheap/best package templates.
Return JSON keys: serviceUnderstanding (string), suggestedBranches, suggestedBuyerTypes, suggestedUseCases, suggestedProblems, suggestedFeatures, buyerIntent, searchPhrases, longTailOpportunities, recurringBuyerLanguage, competitorPositioning, underservedAreas, opportunityGaps, rootNeeds, recommendedPositioning, nonObvious (arrays of {label,why}), followUpTerms (string[]), caveats (string[]).`,
          },
          {
            role: "user",
            content: `Query: ${input.query}\n\nEvidence:\n${input.evidenceText.slice(0, 12000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) {
        return {
          used: false,
          provider: "openai",
          notes: ["OpenAI rate limit reached."],
        };
      }
      if (res.status === 401) {
        return {
          used: false,
          provider: "openai",
          notes: ["OpenAI API key is invalid."],
        };
      }
      return {
        used: false,
        provider: "openai",
        notes: [`OpenAI request failed (${res.status}): ${text.slice(0, 200)}`],
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        used: false,
        provider: "openai",
        notes: ["OpenAI returned an empty response."],
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {
        used: false,
        provider: "openai",
        notes: ["OpenAI returned malformed JSON."],
      };
    }

    return {
      used: true,
      provider: "openai",
      notes: asStringArray(parsed.caveats) ?? [
        "OpenAI interpreted collected evidence (not marketplace private data).",
      ],
      serviceUnderstanding:
        typeof parsed.serviceUnderstanding === "string"
          ? parsed.serviceUnderstanding.trim()
          : undefined,
      suggestedBranches: asItems(parsed.suggestedBranches),
      suggestedBuyerTypes: asItems(parsed.suggestedBuyerTypes),
      suggestedUseCases: asItems(parsed.suggestedUseCases),
      suggestedProblems: asItems(parsed.suggestedProblems),
      suggestedFeatures: asItems(parsed.suggestedFeatures),
      buyerIntent: asItems(parsed.buyerIntent),
      searchPhrases: asItems(parsed.searchPhrases),
      longTailOpportunities: asItems(parsed.longTailOpportunities),
      recurringBuyerLanguage: asItems(parsed.recurringBuyerLanguage),
      competitorPositioning: asItems(parsed.competitorPositioning),
      underservedAreas: asItems(parsed.underservedAreas),
      opportunityGaps: asItems(parsed.opportunityGaps),
      rootNeeds: asItems(parsed.rootNeeds),
      recommendedPositioning: asItems(parsed.recommendedPositioning),
      nonObvious: asItems(parsed.nonObvious),
      followUpTerms: asStringArray(parsed.followUpTerms),
    };
  } catch (error) {
    return {
      used: false,
      provider: "openai",
      notes: [
        error instanceof Error
          ? `OpenAI synthesis error: ${error.message}`
          : "OpenAI synthesis error",
      ],
    };
  }
}

export const openaiProvider: ReasoningProvider = {
  id: "openai",
  isConfigured: isOpenAIConfigured,
  analyzeEvidence: analyzeWithOpenAI,
};
