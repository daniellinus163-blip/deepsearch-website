import type { BoostTag } from "@/lib/analyzer/suggest-tags";

function clampTitle(title: string, max = 80) {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

async function callGeminiJson(prompt: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const models = [
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) {
        if ([429, 503, 404].includes(res.status)) continue;
        return null;
      }
      const raw = await res.text();
      const payload = JSON.parse(raw) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) continue;
      const match = text.match(/\{[\s\S]*\}/);
      return JSON.parse(match?.[0] ?? text) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Rephrase a gig title into a stronger selling point using boost tags.
 */
export async function rephraseGigTitle(input: {
  title: string;
  description?: string;
  currentTags: string[];
  boostTags: BoostTag[];
}): Promise<{ title: string; provider: string }> {
  const tagList = [
    ...input.boostTags.map((t) => t.tag),
    ...input.currentTags,
  ]
    .filter(Boolean)
    .slice(0, 12)
    .join(", ");

  const prompt = `Rewrite this Fiverr gig title to be more selling and buyer-focused.
Use knowledge of these tags (weave 1–2 naturally, no keyword stuffing):
TAGS: ${tagList}

CURRENT TITLE: ${input.title}
SERVICE CONTEXT: ${(input.description || "").slice(0, 400)}

Rules:
- ~80 characters max
- Natural "I will…" Fiverr style when it fits
- Clear selling point / outcome
- Do not invent rankings or fake urgency

Return ONLY JSON: {"title":"string"}`;

  const ai = await callGeminiJson(prompt);
  const title = typeof ai?.title === "string" ? ai.title.trim() : "";
  if (title) {
    return { title: clampTitle(title), provider: "gemini" };
  }

  const boost = input.boostTags[0]?.tag;
  const base = input.title.replace(/^i will\s+/i, "").trim();
  const next = boost
    ? clampTitle(`I will ${base}`.includes(boost) ? `I will ${base}` : `I will ${base} · ${boost}`)
    : clampTitle(input.title.startsWith("I will") ? input.title : `I will ${base}`);
  return { title: next, provider: "rule_based" };
}

/**
 * Rephrase a gig description using boost tags for stronger buyer appeal.
 */
export async function rephraseGigDescription(input: {
  title: string;
  description: string;
  currentTags: string[];
  boostTags: BoostTag[];
}): Promise<{ description: string; provider: string }> {
  const tagList = [
    ...input.boostTags.map((t) => `${t.tag} (${t.kind})`),
    ...input.currentTags,
  ]
    .filter(Boolean)
    .slice(0, 14)
    .join(", ");

  const prompt = `Rewrite this Fiverr gig description to be more selling and clearer for buyers.
Naturally include relevant ideas from these tags (do not dump a keyword list):
TAGS: ${tagList}

TITLE: ${input.title}
CURRENT DESCRIPTION:
${input.description.slice(0, 1800)}

Structure:
1) Buyer problem
2) Who it's for
3) What you fix/create
4) Tools/platforms if relevant
5) Outcome
6) Scope + CTA

Target ~900–1100 characters. Natural writing. No fake ranking claims.

Return ONLY JSON: {"description":"string"}`;

  const ai = await callGeminiJson(prompt);
  const description =
    typeof ai?.description === "string" ? ai.description.trim() : "";
  if (description) {
    return { description: description.slice(0, 1400), provider: "gemini" };
  }

  const tools = input.boostTags
    .filter((t) => t.kind === "tool")
    .map((t) => t.tag)
    .slice(0, 3);
  const problems = input.boostTags
    .filter((t) => t.kind === "problem" || t.kind === "buyer_need")
    .map((t) => t.tag)
    .slice(0, 3);

  const fallback = [
    problems.length
      ? `Tired of ${problems.join(", ")} holding your project back?`
      : "Need this done right the first time?",
    `I deliver ${input.title.replace(/^i will\s+/i, "")} with clear scope and buyer-focused results.`,
    tools.length
      ? `I work with ${tools.join(", ")} and related buyer needs under this service.`
      : "I stay focused on the exact tools and problems in this niche.",
    "Tell me your goal, current setup, and deadline — and I'll outline the fastest path to a working outcome.",
  ].join("\n\n");

  return { description: fallback.slice(0, 1400), provider: "rule_based" };
}
