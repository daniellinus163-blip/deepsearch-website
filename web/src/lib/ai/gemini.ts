import type {
  ReasoningInput,
  ReasoningItem,
  ReasoningProvider,
  ReasoningResult,
} from "@/lib/ai/types";

/**
 * Server-side Gemini reasoning provider.
 * Reads GEMINI_API_KEY from process.env — never expose to client/extension.
 *
 * Uses the official Generative Language REST API so the project stays free of
 * fragile optional SDK installs while remaining compatible with Google's API.
 */

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Tried in order when the preferred model is unavailable / overloaded. */
const MODEL_FALLBACKS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getApiKey());
}

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

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function mapHttpError(status: number, body: string): string {
  if (status === 400) {
    if (/API key not valid|invalid.*key|API_KEY_INVALID/i.test(body)) {
      return "Gemini API key is invalid. Check GEMINI_API_KEY in .env.local.";
    }
    return `Gemini rejected the request (400): ${body.slice(0, 240)}`;
  }
  if (status === 401 || status === 403) {
    return "Gemini authentication failed. Check GEMINI_API_KEY permissions.";
  }
  if (status === 429) {
    return "Gemini rate limit reached. Wait a moment and try again.";
  }
  if (status >= 500) {
    return `Gemini service error (${status}). Try again shortly.`;
  }
  return `Gemini request failed (${status}): ${body.slice(0, 240)}`;
}

const SYSTEM_INSTRUCTION = `You are the DeepSearch research reasoning layer for freelancers.
You ONLY analyze the collected evidence provided by the research engine.

Hard rules:
- Do NOT invent Fiverr search volume, competition scores, buyer counts, conversion rates, rankings, or private marketplace data.
- Do NOT invent sources that are not present in the evidence.
- Do NOT output shallow package templates such as "basic", "premium", "with revisions", "cheap", "best", or "package" as discoveries unless the evidence literally shows those as meaningful buyer phrases.
- Prefer specific service branches, buyer types, problems, use cases, features, search language, and underserved niches grounded in evidence.
- Clearly separate interpretation from observation: your outputs are Gemini interpretations / hypotheses based on evidence.
- If evidence is weak or insufficient, say so in caveats and keep lists short.
- Suggest followUpTerms that are promising for a second research pass (specific phrases, not synonyms of the bare query).

Return ONLY valid JSON with this shape:
{
  "serviceUnderstanding": "string",
  "suggestedBranches": [{"label":"string","why":"string"}],
  "suggestedBuyerTypes": [{"label":"string","why":"string"}],
  "suggestedUseCases": [{"label":"string","why":"string"}],
  "suggestedProblems": [{"label":"string","why":"string"}],
  "suggestedFeatures": [{"label":"string","why":"string"}],
  "buyerIntent": [{"label":"string","why":"string"}],
  "searchPhrases": [{"label":"string","why":"string"}],
  "longTailOpportunities": [{"label":"string","why":"string"}],
  "recurringBuyerLanguage": [{"label":"string","why":"string"}],
  "competitorPositioning": [{"label":"string","why":"string"}],
  "underservedAreas": [{"label":"string","why":"string"}],
  "opportunityGaps": [{"label":"string","why":"string"}],
  "rootNeeds": [{"label":"string","why":"string"}],
  "recommendedPositioning": [{"label":"string","why":"string"}],
  "nonObvious": [{"label":"string","why":"string"}],
  "followUpTerms": ["string"],
  "caveats": ["string"]
}`;

export async function analyzeWithGemini(
  input: ReasoningInput
): Promise<ReasoningResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      used: false,
      provider: "gemini",
      notes: [
        "Gemini not configured (GEMINI_API_KEY missing). Research continues with evidence adapters only.",
      ],
    };
  }

  const preferred =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const models = [
    preferred,
    ...MODEL_FALLBACKS.filter((m) => m !== preferred),
  ];

  try {
    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `User query: ${input.query}\n\nCollected evidence (analyze only this):\n${input.evidenceText.slice(0, 14000)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    let res: Response | null = null;
    let rawBody = "";
    let usedModel = preferred;
    const attemptLog: string[] = [];

    for (const model of models) {
      usedModel = model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      for (let attempt = 0; attempt < 2; attempt++) {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: requestBody,
        });
        rawBody = await res.text();
        attemptLog.push(`${model}#${attempt + 1}=${res.status}`);
        if (res.ok) break;

        // Invalid key / auth — do not try other models
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          return {
            used: false,
            provider: "gemini",
            notes: [mapHttpError(res.status, rawBody)],
          };
        }

        // Rate limit or overload — brief backoff then try next model
        if ((res.status === 429 || res.status === 503) && attempt < 1) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        break;
      }

      if (res?.ok) break;
      // Unavailable / rate-limited / missing model → try next
      if (
        res &&
        (res.status === 404 || res.status === 503 || res.status === 429)
      ) {
        continue;
      }
      if (res && !res.ok) {
        return {
          used: false,
          provider: "gemini",
          notes: [
            mapHttpError(res.status, rawBody),
            `Attempts: ${attemptLog.join(", ")}`,
          ],
        };
      }
    }

    if (!res || !res.ok) {
      return {
        used: false,
        provider: "gemini",
        notes: [
          mapHttpError(res?.status ?? 0, rawBody),
          `Attempts: ${attemptLog.join(", ")}`,
        ],
      };
    }

    let payload: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      return {
        used: false,
        provider: "gemini",
        notes: ["Gemini returned a malformed envelope (not JSON)."],
      };
    }

    if (payload.promptFeedback?.blockReason) {
      return {
        used: false,
        provider: "gemini",
        notes: [
          `Gemini blocked the prompt (${payload.promptFeedback.blockReason}).`,
        ],
      };
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return {
        used: false,
        provider: "gemini",
        notes: [
          "Gemini returned an empty response. Research continues with non-AI evidence only.",
        ],
      };
    }

    const parsed = parseJsonObject(text);
    if (!parsed) {
      return {
        used: false,
        provider: "gemini",
        notes: [
          "Gemini returned malformed JSON. Research continues with non-AI evidence only.",
        ],
      };
    }

    const caveats = asStringArray(parsed.caveats) ?? [];

    return {
      used: true,
      provider: "gemini",
      notes: [
        ...(caveats.length
          ? caveats
          : [
              "Gemini interpreted collected evidence (not marketplace private data).",
            ]),
        `Model: ${usedModel}`,
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
      provider: "gemini",
      notes: [
        error instanceof Error
          ? `Gemini network/runtime error: ${error.message}`
          : "Gemini network/runtime error.",
      ],
    };
  }
}

export const geminiProvider: ReasoningProvider = {
  id: "gemini",
  isConfigured: isGeminiConfigured,
  analyzeEvidence: analyzeWithGemini,
};
