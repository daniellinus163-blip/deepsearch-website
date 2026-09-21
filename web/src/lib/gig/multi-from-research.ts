import type { DeepResearchReport, MicroNicheOpportunity } from "@/lib/research/types";
import type { GigDraftResult, GigFaq, GigPackage } from "@/lib/gig/builder";
import { isGenericNoise } from "@/lib/research/filters";

export type MultiGigExplanation = {
  whyNicheSelected: string;
  buyerProblem: string;
  toolPlatform: string;
  buyerNeed: string;
  marketEvidence: string[];
  competitionSignal: string;
  whyTagsGrouped: string;
  confidence: string;
};

export type MultiGigDraft = {
  nicheId: string;
  nicheTitle: string;
  gig: GigDraftResult;
  selectedTags: string[];
  tagReasons: Array<{ tag: string; reason: string }>;
  explanation: MultiGigExplanation;
  provider: string;
};

export type MultiGigResult = {
  gigs: MultiGigDraft[];
  researchTrace: {
    startingSearch: string;
    marketplaces: string[];
    researchDepth: string;
    tagPoolSize: number;
    niches: string[];
    reasoningProvider: string;
  };
};

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

function clampTitle(title: string, max = 80): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function ruleBasedGig(niche: MicroNicheOpportunity): GigDraftResult {
  const title = clampTitle(
    `I will fix ${niche.problem.toLowerCase()} for ${niche.toolPlatform}`
  );

  const description = [
    `Struggling with ${niche.problem.toLowerCase()} on ${niche.toolPlatform}?`,
    "",
    `I help ${niche.buyer.toLowerCase()} who need ${niche.desiredOutcome.toLowerCase()}.`,
    "",
    `What I do:`,
    `- Diagnose the ${niche.problem.toLowerCase()} in your ${niche.toolPlatform} setup`,
    `- Implement ${niche.service.toLowerCase()} focused on your exact case`,
    `- Confirm the outcome: ${niche.desiredOutcome.toLowerCase()}`,
    "",
    `This is not a generic ${niche.toolPlatform} gig — it targets a specific problem + platform combination researched from public/observable signals.`,
    "",
    `Tell me your current setup, the error/behavior you see, and the result you want. I'll confirm scope before starting.`,
  ]
    .join("\n")
    .slice(0, 1100);

  const packages: GigPackage[] = [
    {
      name: "Basic",
      summary: `Focused diagnosis + fix for one ${niche.problem.toLowerCase()} case`,
      includes: [
        "Problem intake",
        `Single ${niche.toolPlatform} issue path`,
        "2 revision rounds",
      ],
    },
    {
      name: "Standard",
      summary: `Deeper implementation around ${niche.service.toLowerCase()}`,
      includes: [
        "Deeper briefing",
        "Implementation + verification",
        "4 revision rounds",
        "Short handoff notes",
      ],
    },
    {
      name: "Premium",
      summary: `Highest-touch fix + hardening for production readiness`,
      includes: [
        "Priority communication",
        "Full fix + edge-case checks",
        "Usage/guidance notes",
        "Follow-up questions within scope",
      ],
    },
  ];

  const faqs: GigFaq[] = [
    {
      question: `Do you work specifically with ${niche.toolPlatform}?`,
      answer: `Yes — this gig is positioned around ${niche.toolPlatform} and ${niche.problem.toLowerCase()}, not a catch-all offer.`,
    },
    {
      question: `What information do you need about the ${niche.problem.toLowerCase()}?`,
      answer:
        "Share your current setup, exact error/behavior, expected behavior, and any access/details required to reproduce the issue.",
    },
    {
      question: "How do packages differ?",
      answer:
        "Basic covers a focused diagnosis/fix path, Standard adds deeper implementation and verification, Premium is the highest-touch production-oriented option.",
    },
  ];

  return {
    title,
    titleWhy: `Combines tool (${niche.toolPlatform}) + problem (${niche.problem}) without stuffing every tag.`,
    tags: niche.tagCluster.slice(0, 5),
    tagsWhy: niche.whyTagsBelongTogether,
    description,
    descriptionWhy:
      "Opens with the researched problem, names the tool/platform, states the service and outcome — natural freelancer tone.",
    packages,
    packagesWhy:
      "Tiers increase diagnostic/implementation depth for the same micro-niche — not unrelated add-ons.",
    faqs,
    faqsWhy: `FAQs address ${niche.toolPlatform} fit and ${niche.problem.toLowerCase()} intake from research.`,
    requirements: [
      `Confirm you use ${niche.toolPlatform}`,
      "Describe the current problem / error / behavior",
      "Share expected outcome",
      "Provide access or screenshots needed to reproduce",
    ],
    requirementsWhy:
      "Requirements mirror what is needed to solve the researched problem.",
    deliveryStructure:
      "Intake → Reproduce/diagnose → Implement fix → Verify → Deliver notes",
    deliveryWhy: "Matches a problem-fix freelance workflow.",
    buyerPositioning: niche.positioning,
  };
}

async function geminiGigForNiche(
  report: DeepResearchReport,
  niche: MicroNicheOpportunity
): Promise<GigDraftResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const models = [model, "gemini-3.5-flash-lite", "gemini-3.5-flash"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const prompt = `Write ONE Fiverr-style gig for this DISTINCT micro-niche from DeepSearch research.

Starting term: ${report.query}
Micro-niche: ${niche.title}
Buyer: ${niche.buyer}
Problem: ${niche.problem}
Tool/platform: ${niche.toolPlatform}
Service: ${niche.service}
Desired outcome: ${niche.desiredOutcome}
Tag cluster: ${niche.tagCluster.join(", ")}
Positioning: ${niche.positioning}
Competition note: ${niche.competition.why}
Demand: ${niche.demandEvidence.map((d) => d.summary).join(" | ")}
Fiverr limitation: ${report.fiverrLimitationNote}

Return ONLY JSON:
{
  "title": "string (~80 chars, Fiverr style, no stuffing)",
  "titleWhy": "string",
  "tags": ["at least 4 from cluster"],
  "tagReasons": [{"tag":"string","reason":"string"}],
  "description": "string (~1000 chars, natural)",
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
  "buyerPositioning": "string"
}

Rules:
- Do NOT invent private Fiverr data
- Do NOT keyword stuff
- FAQs must relate to this problem/tool
- Packages increase scope for THIS niche only
- Title must not be only the starting tag "${report.query}"`;

  for (const m of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          m
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
              temperature: 0.35,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      const raw = await res.text();
      if (!res.ok) {
        if (res.status === 429 || res.status === 503 || res.status === 404) {
          continue;
        }
        return null;
      }
      const payload = JSON.parse(raw) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) continue;
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? text) as Record<string, unknown>;

      const packages = Array.isArray(parsed.packages)
        ? (parsed.packages as GigPackage[])
        : [];
      const faqs = Array.isArray(parsed.faqs) ? (parsed.faqs as GigFaq[]) : [];

      return {
        title: clampTitle(asString(parsed.title, niche.title)),
        titleWhy: asString(parsed.titleWhy, "Tool + problem focused title."),
        tags: asStringArray(parsed.tags).length
          ? asStringArray(parsed.tags).slice(0, 5)
          : niche.tagCluster.slice(0, 5),
        tagsWhy: asString(parsed.packagesWhy, niche.whyTagsBelongTogether),
        description: asString(parsed.description).slice(0, 1200),
        descriptionWhy: asString(
          parsed.descriptionWhy,
          "Written from micro-niche research."
        ),
        packages: packages.length >= 3 ? packages.slice(0, 3) : ruleBasedGig(niche).packages,
        packagesWhy: asString(parsed.packagesWhy, "Scope increases by depth."),
        faqs: faqs.length ? faqs.slice(0, 6) : ruleBasedGig(niche).faqs,
        faqsWhy: asString(parsed.faqsWhy, "Problem/tool specific FAQs."),
        requirements: asStringArray(parsed.requirements).length
          ? asStringArray(parsed.requirements)
          : ruleBasedGig(niche).requirements,
        requirementsWhy: asString(
          parsed.requirementsWhy,
          "Intake needed for this problem."
        ),
        deliveryStructure: asString(
          parsed.deliveryStructure,
          ruleBasedGig(niche).deliveryStructure
        ),
        deliveryWhy: asString(parsed.deliveryWhy, "Problem-fix workflow."),
        buyerPositioning: asString(
          parsed.buyerPositioning,
          niche.positioning
        ),
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Build up to 4 distinct gigs — one per micro-niche opportunity.
 */
export async function buildMultiGigsFromResearch(
  report: DeepResearchReport
): Promise<MultiGigResult> {
  const niches = report.microNiches.slice(0, 4);
  const gigs: MultiGigDraft[] = [];

  for (const niche of niches) {
    const gemini = await geminiGigForNiche(report, niche);
    const gig = gemini ?? ruleBasedGig(niche);
    const provider = gemini ? "gemini" : "rule_based";

    const tagReasons =
      niche.tagCluster.slice(0, 6).map((tag) => ({
        tag,
        reason: `Belongs to the ${niche.toolPlatform} + ${niche.problem} cluster — ${niche.whyTagsBelongTogether}`,
      }));

    gigs.push({
      nicheId: niche.id,
      nicheTitle: niche.title,
      gig,
      selectedTags: gig.tags,
      tagReasons,
      explanation: {
        whyNicheSelected: niche.positioning,
        buyerProblem: niche.problemDepth.problem,
        toolPlatform: niche.toolPlatform,
        buyerNeed: niche.desiredOutcome,
        marketEvidence: niche.demandEvidence.map(
          (d) => `${d.kind}: ${d.summary}`
        ),
        competitionSignal: `${niche.competition.level}: ${niche.competition.why}`,
        whyTagsGrouped: niche.whyTagsBelongTogether,
        confidence: niche.confidence,
      },
      provider,
    });
  }

  return {
    gigs,
    researchTrace: {
      startingSearch: report.query,
      marketplaces: report.marketplaces,
      researchDepth: report.researchDepth,
      tagPoolSize: report.nicheTagPool.length,
      niches: niches.map((n) => n.title),
      reasoningProvider: report.reasoningProvider,
    },
  };
}
