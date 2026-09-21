import { analyzeEvidenceWithAI } from "@/lib/ai/provider";
import type { ReasoningItem, ReasoningResult } from "@/lib/ai/types";
import { normalizeServiceQuery } from "@/lib/discovery/engine";
import type { DiscoveryProfile } from "@/lib/discovery/catalog";
import { collectResearchDocuments } from "@/lib/research/collector";
import { documentsToEvidence, extractPatterns } from "@/lib/research/extractor";
import { dedupeFindingsByLabel, isGenericNoise } from "@/lib/research/filters";
import {
  buildNicheTagPool,
  buildTagRelationships,
  extractProblemsFromDocuments,
  extractToolsFromDocuments,
  pickPromisingFollowUpTerms,
} from "@/lib/research/niche/extract";
import { bootstrapDocumentsFromQuery } from "@/lib/research/niche/bootstrap";
import { buildMicroNicheOpportunities } from "@/lib/research/niche/opportunities";
import type { ResearchDepth } from "@/lib/research/niche/types";
import { analyzeOpportunities } from "@/lib/research/opportunity";
import type {
  BuyerNeedExplanation,
  DeepResearchReport,
  Finding,
  SearchTermEntry,
  SourceTrace,
} from "@/lib/research/types";

function titleCase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      w.toUpperCase() === w && w.length <= 4
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

function findingLabels(items: Finding[], limit = 8) {
  return items
    .filter((i) => !isGenericNoise(i.label))
    .slice(0, limit)
    .map((i) => i.label);
}

function aiToFindings(
  items: ReasoningItem[] | undefined,
  whyFallback: string,
  evidenceIds: string[]
): Finding[] {
  return (items ?? [])
    .filter((i) => i.label && !isGenericNoise(i.label))
    .map((item) => ({
      label: titleCase(item.label),
      why: item.why?.trim() || whyFallback,
      evidenceIds: evidenceIds.slice(0, 3),
      confidence: "hypothesis" as const,
      kind: "ai_interpretation" as const,
    }));
}

function buildSearchTermHierarchy(input: {
  query: string;
  coreService: string;
  branches: Finding[];
  features: Finding[];
  problems: Finding[];
  buyerTypes: Finding[];
  useCases: Finding[];
  related: {
    specific: Finding[];
    longTail: Finding[];
    buyerIntent: Finding[];
  };
  evidenceIds: string[];
}): SearchTermEntry[] {
  const entries: SearchTermEntry[] = [];
  const push = (
    term: string,
    type: SearchTermEntry["type"],
    relationship: string,
    why: string,
    confidence: SearchTermEntry["confidence"],
    evidenceIds: string[]
  ) => {
    if (!term || isGenericNoise(term)) return;
    if (entries.some((e) => e.term.toLowerCase() === term.toLowerCase())) return;
    entries.push({ term, type, relationship, why, evidenceIds, confidence });
  };

  push(
    input.query,
    "starting",
    "user starting term",
    "Original research input — starting point, not necessarily the final niche.",
    "strong",
    input.evidenceIds.slice(0, 1)
  );
  push(
    input.coreService,
    "core",
    "core service",
    "Normalized core service topic after understanding the query.",
    "moderate",
    input.evidenceIds.slice(0, 2)
  );

  for (const b of input.branches.slice(0, 5)) {
    push(b.label, "primary", "service branch", b.why, b.confidence, b.evidenceIds);
  }
  for (const f of input.related.specific.slice(0, 5)) {
    push(f.label, "secondary", "specific term", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.related.longTail.slice(0, 5)) {
    push(f.label, "long_tail", "long-tail term", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.related.buyerIntent.slice(0, 5)) {
    push(f.label, "buyer_intent", "buyer-intent phrasing", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.problems.slice(0, 4)) {
    push(f.label, "problem", "buyer problem language", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.useCases.slice(0, 4)) {
    push(f.label, "outcome", "use-case / outcome", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.features.slice(0, 4)) {
    push(f.label, "feature", "feature / requirement", f.why, f.confidence, f.evidenceIds);
  }
  for (const f of input.buyerTypes.slice(0, 4)) {
    push(f.label, "audience", "buyer / audience", f.why, f.confidence, f.evidenceIds);
  }

  return entries.slice(0, 40);
}

function buildWhyBuyersNeed(input: {
  ai: ReasoningResult;
  problems: Finding[];
  useCases: Finding[];
  rootNeeds: Finding[];
  positioning: Finding[];
  coreService: string;
}): BuyerNeedExplanation[] {
  const out: BuyerNeedExplanation[] = [];

  for (const root of input.rootNeeds.slice(0, 3)) {
    out.push({
      buyerNeed: root.label,
      problem:
        input.problems[0]?.label ||
        `Unclear or generic ${input.coreService.toLowerCase()} options`,
      desiredOutcome:
        input.useCases[0]?.label ||
        `A clearer ${input.coreService.toLowerCase()} result`,
      evidence: root.why,
      opportunity:
        input.positioning[0]?.label ||
        `Position ${input.coreService} around this root need rather than the bare starting tag.`,
      whyItMatters:
        "Targets a specific buyer motivation instead of competing only on a broad starting term.",
      confidence: root.confidence,
      kind: root.kind,
    });
  }

  for (const problem of input.problems.slice(0, 3)) {
    if (out.some((o) => o.problem.toLowerCase() === problem.label.toLowerCase())) {
      continue;
    }
    out.push({
      buyerNeed: `Resolve: ${problem.label}`,
      problem: problem.label,
      desiredOutcome:
        input.useCases[0]?.label || "A usable, buyer-specific deliverable",
      evidence: problem.why,
      opportunity: `Offer ${input.coreService} framed as the fix for this problem.`,
      whyItMatters:
        "Problem-led positioning is more useful than repeating the original tag.",
      confidence: problem.confidence,
      kind: problem.kind,
    });
  }

  return out.slice(0, 8);
}

function toSourceTraces(
  evidence: DeepResearchReport["evidence"]
): SourceTrace[] {
  return evidence.map((e) => ({
    id: e.id,
    source: e.source,
    sourceType: e.kind,
    url: e.url,
    researchedAt: e.collectedAt,
    observed: e.snippet,
    interpretation:
      e.kind === "ai_interpretation"
        ? "AI interpretation of observed/curated evidence"
        : undefined,
  }));
}

/**
 * Research Orchestrator — problem-first micro-niche pipeline.
 */
export async function runDeepResearch(input: {
  query: string;
  userId?: string | null;
  marketplaces?: string[];
  researchDepth?: ResearchDepth;
}): Promise<{ report: DeepResearchReport; profile: DiscoveryProfile }> {
  const sourceQuery = input.query.trim();
  if (!sourceQuery) throw new Error("Enter what you want to sell.");

  const normalized = normalizeServiceQuery(sourceQuery);
  if (!normalized) throw new Error("Could not understand that service.");

  const coreService = titleCase(normalized);
  const marketplaces = (input.marketplaces ?? []).filter(Boolean);
  const researchDepth: ResearchDepth = input.researchDepth ?? "standard";
  const ctxBase = {
    userId: input.userId,
    normalizedQuery: normalized,
    marketplaces,
    researchDepth,
  };

  // Pass 1
  const pass1 = await collectResearchDocuments(normalized, ctxBase);
  const bootstrap = bootstrapDocumentsFromQuery(sourceQuery);
  let docs = [...bootstrap, ...pass1.docs];
  let adaptersUsed = [
    ...(bootstrap.length ? ["query_bootstrap"] : []),
    ...pass1.adaptersUsed,
  ];

  // Early niche extraction → follow-ups (problem/tool focused)
  let evidence = documentsToEvidence(docs);
  let tools = extractToolsFromDocuments(docs, evidence);
  let problems = extractProblemsFromDocuments(docs, evidence, coreService);

  const earlyTags = buildNicheTagPool({
    query: sourceQuery,
    coreService,
    problems,
    tools,
    branches: [],
    features: [],
    buyers: [],
    useCases: [],
    longTails: [],
    intentTerms: [],
    evidenceIds: evidence.slice(0, 3).map((e) => e.id),
  });

  const followBudget =
    researchDepth === "quick" ? 2 : researchDepth === "deep" ? 6 : 4;
  const seedFollowUps = pickPromisingFollowUpTerms(earlyTags, followBudget);

  if (seedFollowUps.length && researchDepth !== "quick") {
    const pass2 = await collectResearchDocuments(normalized, {
      ...ctxBase,
      followUpTerms: seedFollowUps,
    });
    docs = [...docs, ...pass2.docs];
    adaptersUsed = [...new Set([...adaptersUsed, ...pass2.adaptersUsed])];
  }

  evidence = documentsToEvidence(docs);
  const patterns = extractPatterns(normalized, docs, evidence);
  const evidenceIds = evidence.slice(0, 4).map((e) => e.id);

  // Gemini reasoning
  const ai: ReasoningResult = await analyzeEvidenceWithAI({
    query: normalized,
    evidenceText: evidence.map((e) => `[${e.source}] ${e.snippet}`).join("\n"),
  });

  // Deep mode: second recursive round on Gemini follow-ups + tools
  if (researchDepth === "deep" && ai.used) {
    const deepFollowUps = [
      ...(ai.followUpTerms ?? []),
      ...tools.slice(0, 2).map((t) => `${t.tag} common problems`),
      ...problems.slice(0, 2).map((p) => `${coreService} ${p.problem}`),
    ]
      .filter((t) => t && !isGenericNoise(t))
      .slice(0, 5);

    if (deepFollowUps.length) {
      const pass3 = await collectResearchDocuments(normalized, {
        ...ctxBase,
        followUpTerms: deepFollowUps,
      });
      if (pass3.docs.length) {
        docs = [...docs, ...pass3.docs];
        adaptersUsed = [...new Set([...adaptersUsed, ...pass3.adaptersUsed])];
        evidence = documentsToEvidence(docs);
      }
    }
  }

  const finalEvidence = evidence;
  const finalEvidenceIds = finalEvidence.slice(0, 4).map((e) => e.id);
  let finalPatterns = extractPatterns(normalized, docs, finalEvidence);

  const whyAi =
    "Gemini interpretation of collected research evidence (not private marketplace data).";

  if (ai.used) {
    finalPatterns.serviceBranches.push(
      ...aiToFindings(ai.suggestedBranches, whyAi, finalEvidenceIds)
    );
    finalPatterns.buyerTypes.push(
      ...aiToFindings(ai.suggestedBuyerTypes, whyAi, finalEvidenceIds)
    );
    finalPatterns.useCases.push(
      ...aiToFindings(ai.suggestedUseCases, whyAi, finalEvidenceIds)
    );
    finalPatterns.buyerProblems.push(
      ...aiToFindings(ai.suggestedProblems, whyAi, finalEvidenceIds)
    );
    finalPatterns.features.push(
      ...aiToFindings(ai.suggestedFeatures, whyAi, finalEvidenceIds)
    );
    finalPatterns.relatedTerms.buyerIntent.push(
      ...aiToFindings(ai.buyerIntent, whyAi, finalEvidenceIds)
    );
    finalPatterns.relatedTerms.specific.push(
      ...aiToFindings(ai.searchPhrases, whyAi, finalEvidenceIds)
    );
    finalPatterns.relatedTerms.longTail.push(
      ...aiToFindings(ai.longTailOpportunities, whyAi, finalEvidenceIds)
    );
    finalPatterns.competitorObservations.push(
      ...aiToFindings(ai.competitorPositioning, whyAi, finalEvidenceIds)
    );
  }

  const serviceBranches = dedupeFindingsByLabel(finalPatterns.serviceBranches);
  const buyerTypes = dedupeFindingsByLabel(finalPatterns.buyerTypes);
  const useCases = dedupeFindingsByLabel(finalPatterns.useCases);
  const buyerProblems = dedupeFindingsByLabel(finalPatterns.buyerProblems);
  const features = dedupeFindingsByLabel(finalPatterns.features);

  // Refresh problem/tool extraction on full doc set
  tools = extractToolsFromDocuments(docs, finalEvidence);
  problems = extractProblemsFromDocuments(docs, finalEvidence, coreService);

  // Merge AI problems into problem depths when specific
  for (const p of ai.suggestedProblems ?? []) {
    if (!p.label || isGenericNoise(p.label)) continue;
    if (problems.some((x) => x.problem.toLowerCase() === p.label.toLowerCase())) {
      continue;
    }
    problems.push({
      problem: titleCase(p.label),
      who: buyerTypes[0]?.label || "Relevant buyers from research",
      toolPlatform: tools[0]?.tag || coreService,
      whyTheyNeedHelp:
        p.why || "Gemini interpretation of problem language in evidence.",
      desiredOutcome: useCases[0]?.label || "A fixed, working outcome",
      serviceRequired: `Address ${p.label} within ${coreService}`,
      evidence: p.why || whyAi,
      opportunity: `Micro-niche around this problem rather than broad ${coreService}.`,
      confidence: "hypothesis",
      kind: "ai_interpretation",
      evidenceIds: finalEvidenceIds,
    });
  }

  const rootNeeds = dedupeFindingsByLabel(
    aiToFindings(
      ai.rootNeeds,
      "Root need inferred by Gemini from buyer-problem language in evidence.",
      finalEvidenceIds
    )
  );

  const opportunityGaps = dedupeFindingsByLabel([
    ...aiToFindings(
      ai.opportunityGaps,
      "Potential positioning gap hypothesized by Gemini — not a low-competition claim.",
      finalEvidenceIds
    ),
    ...aiToFindings(
      ai.underservedAreas,
      "Underserved-area hypothesis from evidence — not private Fiverr stats.",
      finalEvidenceIds
    ),
  ]);

  const recommendedPositioning = dedupeFindingsByLabel(
    aiToFindings(
      ai.recommendedPositioning,
      "Positioning recommendation based on Gemini analysis of collected evidence.",
      finalEvidenceIds
    )
  );

  const nicheTagPool = buildNicheTagPool({
    query: sourceQuery,
    coreService,
    problems,
    tools,
    branches: serviceBranches.map((b) => b.label),
    features: features.map((f) => f.label),
    buyers: buyerTypes.map((b) => b.label),
    useCases: useCases.map((u) => u.label),
    longTails: finalPatterns.relatedTerms.longTail.map((t) => t.label),
    intentTerms: finalPatterns.relatedTerms.buyerIntent.map((t) => t.label),
    evidenceIds: finalEvidenceIds,
  }).map((t) => ({
    ...t,
    researched: true,
  }));

  const tagRelationships = buildTagRelationships(nicheTagPool);

  const microNiches = buildMicroNicheOpportunities({
    coreService,
    problems,
    tools,
    tags: nicheTagPool,
    buyers: buyerTypes.map((b) => b.label),
    services: serviceBranches.map((b) => b.label),
    docs,
    evidence: finalEvidence,
  });

  const discoveredTools: Finding[] = tools.map((t) => ({
    label: t.tag,
    why: t.reasonItMatters,
    evidenceIds: t.evidenceIds,
    confidence: t.confidence,
    kind: "inferred" as const,
  }));

  const nonObvious = dedupeFindingsByLabel([
    ...serviceBranches.filter(
      (b) => b.label.toLowerCase() !== coreService.toLowerCase()
    ),
    ...discoveredTools,
    ...aiToFindings(
      ai.nonObvious,
      "Flagged as non-obvious relative to the bare query — Gemini interpretation.",
      finalEvidenceIds
    ),
    ...finalPatterns.relatedTerms.longTail.slice(0, 5),
  ]).slice(0, 12);

  const opportunitySignals = analyzeOpportunities({
    coreService,
    buyerTypes,
    useCases,
    features,
    problems: buyerProblems,
    serviceBranches,
  });

  const searchTermHierarchy = buildSearchTermHierarchy({
    query: sourceQuery,
    coreService,
    branches: serviceBranches,
    features,
    problems: buyerProblems,
    buyerTypes,
    useCases,
    related: {
      specific: dedupeFindingsByLabel(finalPatterns.relatedTerms.specific),
      longTail: dedupeFindingsByLabel(finalPatterns.relatedTerms.longTail),
      buyerIntent: dedupeFindingsByLabel(finalPatterns.relatedTerms.buyerIntent),
    },
    evidenceIds: finalEvidenceIds,
  });

  const whyBuyersNeed = buildWhyBuyersNeed({
    ai,
    problems: buyerProblems,
    useCases,
    rootNeeds,
    positioning: recommendedPositioning,
    coreService,
  });

  const insufficientNotes: string[] = [];
  if (docs.length === 0) {
    insufficientNotes.push(
      "No sources returned documents. Evidence is insufficient for strong recommendations."
    );
  }
  const hasFiverr = marketplaces.some((m) => /fiverr/i.test(m));
  if (hasFiverr && !adaptersUsed.some((a) => a.includes("marketplace:fiverr"))) {
    insufficientNotes.push(
      "Fiverr is selected, but no Fiverr adapter evidence was collected. Capture public gig pages with the extension."
    );
  }
  if (!ai.used) {
    insufficientNotes.push(...ai.notes);
  }
  if (microNiches.length === 0) {
    insufficientNotes.push(
      "Could not form distinct tool+problem micro-niches from current evidence. Prefer a more technical starting term or capture Fiverr listings."
    );
  }
  if (nicheTagPool.length < 15) {
    insufficientNotes.push(
      `Tag pool has ${nicheTagPool.length} evidence-backed tags (quality over quantity). Deeper mode or more Fiverr captures may expand it.`
    );
  }

  const fiverrLimitationNote =
    "Based on publicly observable Fiverr listings (when captured), public web indexes of Fiverr pages, and other allowed public/curated sources. This system does not access Fiverr's private search volume, private buyer searches, internal ranking algorithm, conversion data, or hidden competition scores.";

  const serviceUnderstanding =
    ai.serviceUnderstanding?.trim() ||
    `Broad service topic: "${coreService}". Research adapters collected ${docs.length} document(s). Depth: ${researchDepth}.`;

  const report: DeepResearchReport = {
    query: sourceQuery,
    coreService,
    marketplaces,
    researchDepth,
    serviceUnderstanding,
    serviceBranches,
    buyerTypes,
    useCases,
    buyerProblems,
    features,
    relatedTerms: {
      broad: finalPatterns.relatedTerms.broad,
      specific: dedupeFindingsByLabel(finalPatterns.relatedTerms.specific),
      longTail: dedupeFindingsByLabel(finalPatterns.relatedTerms.longTail),
      buyerIntent: dedupeFindingsByLabel(finalPatterns.relatedTerms.buyerIntent),
    },
    searchTermHierarchy,
    whyBuyersNeed,
    problemDepths: problems.slice(0, 10),
    nicheTagPool,
    tagRelationships,
    microNiches,
    discoveredTools,
    rootNeeds,
    nonObvious,
    opportunitySignals,
    opportunityGaps,
    competitorObservations: dedupeFindingsByLabel(
      finalPatterns.competitorObservations
    ).slice(0, 12),
    recommendedPositioning,
    evidence: finalEvidence,
    sourceTraces: toSourceTraces(finalEvidence),
    insufficientNotes: [...new Set(insufficientNotes)],
    researchedAt: new Date().toISOString(),
    adaptersUsed: [...new Set(adaptersUsed)],
    reasoningProvider: ai.used ? ai.provider : "none",
    fiverrLimitationNote,
  };

  let mainService = coreService;
  if (microNiches[0]) {
    mainService = titleCase(
      `${microNiches[0].toolPlatform} ${microNiches[0].problem}`
    ).slice(0, 80);
  } else {
    const primaryBranch = serviceBranches.find(
      (b) => b.label.toLowerCase() !== coreService.toLowerCase()
    );
    if (primaryBranch && !isGenericNoise(primaryBranch.label)) {
      mainService = primaryBranch.label.toLowerCase().includes(coreService.toLowerCase())
        ? titleCase(primaryBranch.label)
        : titleCase(`${coreService} ${primaryBranch.label}`);
      mainService = mainService.slice(0, 80);
    }
  }

  const profile: DiscoveryProfile = {
    sourceQuery,
    mainService,
    category: microNiches[0]
      ? `Micro-niche: ${microNiches[0].title}`
      : serviceBranches[0]?.label && serviceBranches[0].label !== coreService
        ? `Research: ${serviceBranches[0].label}`
        : `Research: ${coreService}`,
    subServices: findingLabels(serviceBranches, 8),
    buyerTypes: findingLabels(buyerTypes, 6),
    useCases: findingLabels(useCases, 6),
    matchedCatalog: null,
  };

  return { report, profile };
}

export function reportConfidenceSummary(report: DeepResearchReport): string {
  const strong = report.evidence.filter((e) => e.confidence === "strong").length;
  const moderate = report.evidence.filter(
    (e) => e.confidence === "moderate"
  ).length;
  const markets =
    report.marketplaces.length > 0
      ? ` · Markets: ${report.marketplaces.join(", ")}`
      : "";
  const depth = ` · Depth: ${report.researchDepth}`;
  const niches = ` · Niches: ${report.microNiches.length}`;
  const aiNote =
    report.reasoningProvider !== "none"
      ? ` · AI: ${report.reasoningProvider}`
      : " · AI: not used";
  if (report.evidence.length === 0)
    return `Insufficient evidence${aiNote}${markets}${depth}${niches}`;
  if (strong >= 3)
    return `Strong evidence available for some findings${aiNote}${markets}${depth}${niches}`;
  if (strong + moderate >= 3)
    return `Moderate evidence${aiNote}${markets}${depth}${niches}`;
  return `Weak evidence / hypotheses only${aiNote}${markets}${depth}${niches}`;
}
