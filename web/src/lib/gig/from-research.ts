import { isGenericNoise } from "@/lib/research/filters";
import type { DeepResearchReport } from "@/lib/research/types";
import type { GigDraftResult, GigFaq, GigPackage } from "@/lib/gig/builder";
import { buildGigDraft } from "@/lib/gig/builder";
import type { PositioningDraft } from "@/lib/positioning/engine";

export type ResearchGigExplanation = {
  primaryTerm: string;
  primaryReason: string;
  relatedTerms: Array<{ term: string; reason: string }>;
  buyerNeed: string;
  buyerNeedReason: string;
  positioning: string;
  positioningReason: string;
  tagReasons: Array<{ tag: string; reason: string }>;
};

export type ResearchGigResult = {
  gig: GigDraftResult;
  explanation: ResearchGigExplanation;
  researchTrace: {
    startingSearch: string;
    marketplaces: string[];
    coreService: string;
    selectedOpportunities: string[];
    selectedTerms: string[];
    buyerIntent: string[];
    positioning: string[];
    reasoningProvider: string;
  };
  provider: string;
};

function summarizeReport(report: DeepResearchReport): string {
  return [
    `Starting search: ${report.query}`,
    `Marketplaces: ${report.marketplaces.join(", ") || "none selected"}`,
    `Core service: ${report.coreService}`,
    `Understanding: ${report.serviceUnderstanding}`,
    `Branches: ${report.serviceBranches.map((b) => b.label).join("; ")}`,
    `Buyers: ${report.buyerTypes.map((b) => b.label).join("; ")}`,
    `Problems: ${report.buyerProblems.map((b) => b.label).join("; ")}`,
    `Use cases: ${report.useCases.map((b) => b.label).join("; ")}`,
    `Features: ${report.features.map((b) => b.label).join("; ")}`,
    `Root needs: ${report.rootNeeds.map((b) => b.label).join("; ")}`,
    `Positioning: ${report.recommendedPositioning.map((b) => b.label).join("; ")}`,
    `Why buyers need: ${report.whyBuyersNeed
      .map((w) => `${w.buyerNeed} / ${w.problem} → ${w.desiredOutcome}`)
      .join(" || ")}`,
    `Search terms: ${report.searchTermHierarchy
      .slice(0, 20)
      .map((t) => `${t.type}:${t.term}`)
      .join("; ")}`,
    `Competitor observations: ${report.competitorObservations
      .map((c) => c.label)
      .slice(0, 8)
      .join("; ")}`,
    `Evidence snippets:\n${report.evidence
      .slice(0, 12)
      .map((e) => `[${e.id}|${e.source}] ${e.snippet}`)
      .join("\n")}`,
  ].join("\n");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v && !isGenericNoise(v));
}

function asPackages(value: unknown): GigPackage[] {
  if (!Array.isArray(value)) return [];
  const out: GigPackage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = asString(e.name);
    if (!name) continue;
    out.push({
      name,
      summary: asString(e.summary, `${name} package`),
      includes: asStringArray(e.includes).slice(0, 8),
    });
  }
  return out;
}

function asFaqs(value: unknown): GigFaq[] {
  if (!Array.isArray(value)) return [];
  const out: GigFaq[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const question = asString(e.question);
    const answer = asString(e.answer);
    if (!question || !answer) continue;
    out.push({ question, answer });
  }
  return out;
}

/**
 * Build a Fiverr-style gig from completed deep research.
 * Gemini writes naturally from evidence; falls back to rule-based builder.
 */
export async function buildGigFromResearch(
  report: DeepResearchReport,
  mainServiceHint?: string
): Promise<ResearchGigResult> {
  const primaryService =
    mainServiceHint?.trim() ||
    report.recommendedPositioning[0]?.label ||
    report.serviceBranches.find(
      (b) => b.label.toLowerCase() !== report.coreService.toLowerCase()
    )?.label ||
    report.coreService;

  const positioning: PositioningDraft = {
    targetBuyer: report.buyerTypes[0]?.label || "your ideal buyer",
    problem: report.buyerProblems[0]?.label || "generic undifferentiated offers",
    desiredResult: report.useCases[0]?.label || "a clear usable outcome",
    serviceOffer: primaryService,
    differentiator:
      report.features[0]?.label || report.nonObvious[0]?.label || primaryService,
    positioningStatement:
      report.recommendedPositioning[0]?.label ||
      `Position around ${report.buyerTypes[0]?.label || "a specific buyer"} needing ${primaryService}`,
  };

  const fallback = buildGigDraft({
    mainService: primaryService,
    subServices: report.serviceBranches.map((b) => b.label),
    keywords: report.searchTermHierarchy.map((t) => t.term).slice(0, 10),
    opportunityTitle: report.opportunityGaps[0]?.label,
    positioning,
  });

  const gigAi = await writeGigWithGemini(report, primaryService);

  if (!gigAi) {
    return {
      gig: fallback,
      explanation: {
        primaryTerm: primaryService,
        primaryReason:
          "Derived from research branches/positioning (rule-based fallback — Gemini unavailable).",
        relatedTerms: report.searchTermHierarchy.slice(0, 5).map((t) => ({
          term: t.term,
          reason: t.why,
        })),
        buyerNeed: report.whyBuyersNeed[0]?.buyerNeed || "Buyer-specific outcome",
        buyerNeedReason: report.whyBuyersNeed[0]?.evidence || "From research report",
        positioning: fallback.buyerPositioning,
        positioningReason: fallback.descriptionWhy,
        tagReasons: fallback.tags.map((tag) => ({
          tag,
          reason: "Selected from researched terms / service branches.",
        })),
      },
      researchTrace: buildTrace(report, primaryService),
      provider: "rule_based",
    };
  }

  return gigAi;
}

async function writeGigWithGemini(
  report: DeepResearchReport,
  primaryService: string
): Promise<ResearchGigResult | null> {
  const { analyzeWithGemini, isGeminiConfigured } = await import(
    "@/lib/ai/gemini"
  );
  if (!isGeminiConfigured()) return null;

  // Use Gemini with a gig-writing instruction by piggybacking evidence text
  // through the existing Gemini client via a temporary specialized call.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const models = [
    model,
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const prompt = `You write Fiverr gigs from DeepSearch research evidence only.

Starting tag: ${report.query}
Primary service to feature: ${primaryService}
Marketplaces: ${report.marketplaces.join(", ") || "Fiverr"}

Research:
${summarizeReport(report)}

Return ONLY valid JSON:
{
  "title": "string",
  "titleWhy": "string",
  "tags": ["string"],
  "tagReasons": [{"tag":"string","reason":"string"}],
  "description": "string (natural multi-paragraph)",
  "descriptionWhy": "string",
  "packages": [
    {"name":"Basic","summary":"string","includes":["string"]},
    {"name":"Standard","summary":"string","includes":["string"]},
    {"name":"Premium","summary":"string","includes":["string"]}
  ],
  "packagesWhy": "string",
  "faqs": [{"question":"string","answer":"string"}],
  "faqsWhy": "string",
  "requirements": ["string"],
  "requirementsWhy": "string",
  "deliveryStructure": "string",
  "deliveryWhy": "string",
  "buyerPositioning": "string",
  "primaryTerm": "string",
  "primaryReason": "string",
  "relatedTerms": [{"term":"string","reason":"string"}],
  "buyerNeed": "string",
  "buyerNeedReason": "string",
  "positioning": "string",
  "positioningReason": "string"
}

Rules:
- Do NOT keyword-stuff the starting tag everywhere
- Do NOT invent search volume, rankings, or private Fiverr data
- Title should be buyer-focused and concise
- Tags should reflect deeper researched terms
- Packages must logically differ by scope
- Sound human and natural`;

  let rawBody = "";
  let ok = false;
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      m
    )}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    });
    rawBody = await res.text();
    if (res.ok) {
      ok = true;
      break;
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) break;
    if (res.status === 429 || res.status === 503 || res.status === 404) continue;
    break;
  }

  if (!ok) return null;

  try {
    const payload = JSON.parse(rawBody) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as Record<string, unknown>;

    const tags = asStringArray(parsed.tags).slice(0, 8);
    const packages = asPackages(parsed.packages);
    const faqs = asFaqs(parsed.faqs);

    const gig: GigDraftResult = {
      title: asString(parsed.title, primaryService),
      titleWhy: asString(parsed.titleWhy, "Based on researched primary service."),
      tags: tags.length
        ? tags
        : report.searchTermHierarchy
            .filter((t) => t.type !== "starting")
            .map((t) => t.term)
            .slice(0, 8),
      tagsWhy: asString(
        parsed.descriptionWhy && parsed.tags
          ? "Tags selected from deeper researched terms."
          : "Tags selected from research hierarchy."
      ),
      description: asString(
        parsed.description,
        `I help buyers get ${primaryService}.`
      ),
      descriptionWhy: asString(
        parsed.descriptionWhy,
        "Written from researched buyer problems and outcomes."
      ),
      packages:
        packages.length >= 3
          ? packages.slice(0, 3)
          : [
              {
                name: "Basic",
                summary: `Essential ${primaryService}`,
                includes: ["Core deliverable", "2 revisions"],
              },
              {
                name: "Standard",
                summary: `Stronger ${primaryService} with more refinement`,
                includes: ["Deeper briefing", "4 revisions", "Source files where applicable"],
              },
              {
                name: "Premium",
                summary: `Highest-touch ${primaryService}`,
                includes: [
                  "Priority communication",
                  "Full deliverable",
                  "Usage notes",
                ],
              },
            ],
      packagesWhy: asString(
        parsed.packagesWhy,
        "Tiers differ by depth and buyer-fit from research."
      ),
      faqs: faqs.length
        ? faqs.slice(0, 6)
        : [
            {
              question: "What do you need to start?",
              answer:
                "Share your goal, references, constraints, and deadline.",
            },
          ],
      faqsWhy: asString(parsed.faqsWhy, "FAQs address researched buyer questions."),
      requirements: asStringArray(parsed.requirements).length
        ? asStringArray(parsed.requirements)
        : [
            "Describe your goal and audience",
            "Share references",
            "List must-haves",
            "Confirm deadline",
          ],
      requirementsWhy: asString(
        parsed.requirementsWhy,
        "Collects inputs needed for a research-aligned deliverable."
      ),
      deliveryStructure: asString(
        parsed.deliveryStructure,
        "Brief confirmation → First draft → Revisions → Final delivery"
      ),
      deliveryWhy: asString(
        parsed.deliveryWhy,
        "Visible process builds trust and sets expectations."
      ),
      buyerPositioning: asString(
        parsed.buyerPositioning || parsed.positioning,
        report.recommendedPositioning[0]?.label || primaryService
      ),
    };

    const relatedTerms = Array.isArray(parsed.relatedTerms)
      ? parsed.relatedTerms
          .filter((r): r is { term?: string; reason?: string } => !!r && typeof r === "object")
          .map((r) => ({
            term: asString(r.term),
            reason: asString(r.reason, "From research"),
          }))
          .filter((r) => r.term)
      : [];

    const tagReasons = Array.isArray(parsed.tagReasons)
      ? parsed.tagReasons
          .filter((r): r is { tag?: string; reason?: string } => !!r && typeof r === "object")
          .map((r) => ({
            tag: asString(r.tag),
            reason: asString(r.reason, "From research"),
          }))
          .filter((r) => r.tag)
      : gig.tags.map((tag) => ({
          tag,
          reason: "Selected from researched search terms.",
        }));

    return {
      gig,
      explanation: {
        primaryTerm: asString(parsed.primaryTerm, primaryService),
        primaryReason: asString(
          parsed.primaryReason,
          "Primary service chosen from research branches, not only the starting tag."
        ),
        relatedTerms: relatedTerms.slice(0, 8),
        buyerNeed: asString(
          parsed.buyerNeed,
          report.whyBuyersNeed[0]?.buyerNeed || "Buyer-specific outcome"
        ),
        buyerNeedReason: asString(
          parsed.buyerNeedReason,
          report.whyBuyersNeed[0]?.evidence || "From research evidence"
        ),
        positioning: asString(
          parsed.positioning,
          gig.buyerPositioning
        ),
        positioningReason: asString(
          parsed.positioningReason,
          report.recommendedPositioning[0]?.why ||
            "Positioning follows researched buyer needs."
        ),
        tagReasons,
      },
      researchTrace: buildTrace(report, primaryService),
      provider: "gemini",
    };
  } catch {
    return null;
  }
}

function buildTrace(report: DeepResearchReport, primaryService: string) {
  return {
    startingSearch: report.query,
    marketplaces: report.marketplaces,
    coreService: report.coreService,
    selectedOpportunities: [
      primaryService,
      ...report.opportunityGaps.map((o) => o.label).slice(0, 3),
    ],
    selectedTerms: report.searchTermHierarchy.map((t) => t.term).slice(0, 12),
    buyerIntent: report.relatedTerms.buyerIntent.map((b) => b.label).slice(0, 6),
    positioning: report.recommendedPositioning.map((p) => p.label).slice(0, 4),
    reasoningProvider: report.reasoningProvider,
  };
}
