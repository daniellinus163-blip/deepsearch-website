import type { CollectedDocument, ResearchEvidence } from "@/lib/research/types";
import type {
  CompetitionSignal,
  DemandEvidence,
  MicroNicheOpportunity,
  NicheTag,
  ProblemDepth,
  NicheSignalLevel,
} from "@/lib/research/niche/types";

function countMarketplaceDocs(docs: CollectedDocument[], needle: string): number {
  const n = needle.toLowerCase();
  return docs.filter((d) => {
    if (
      d.adapter !== "saved_marketplace_listings" &&
      !d.adapter.startsWith("marketplace:")
    ) {
      return false;
    }
    const blob = `${d.title} ${d.text}`.toLowerCase();
    return n.split(/\s+/).filter((t) => t.length > 2).some((t) => blob.includes(t));
  }).length;
}

function competitionFromCount(count: number, specificity: number): CompetitionSignal {
  let level: NicheSignalLevel = "insufficient_evidence";
  let why = "";

  if (count === 0 && specificity < 2) {
    level = "insufficient_evidence";
    why =
      "No directly relevant public/saved marketplace listings matched this niche combination, and specificity is still low — evidence is insufficient to call it a niche signal.";
  } else if (count === 0 && specificity >= 2) {
    level = "stronger_niche_signal";
    why =
      "Specific tool/problem combination with few or no directly matching observable listings found in this research pass. This is an observable-listing signal only — not private Fiverr competition data.";
  } else if (count <= 3 && specificity >= 2) {
    level = "stronger_niche_signal";
    why = `Only ${count} directly relevant observable listing(s) matched this specific combination in researched sources, while the niche is relatively specific (tool/problem). Not a private competition score.`;
  } else if (count <= 8) {
    level = "moderate_niche_signal";
    why = `${count} relevant observable listing(s) found. Some sellers address related themes, but exact tool+problem positioning may still leave room — hypothesis from public/observable data only.`;
  } else {
    level = "weak_niche_signal";
    why = `${count} relevant observable listing(s) found — broader or more crowded positioning in public results. Prefer a tighter tool+problem angle.`;
  }

  return {
    level,
    why,
    observedListingCount: count,
    notes: [
      "Based on publicly observable / saved listing matches in this research session.",
      "Does not use Fiverr private search volume, ranking, or hidden competition APIs.",
    ],
  };
}

function demandForNiche(
  docs: CollectedDocument[],
  evidence: ResearchEvidence[],
  problem: ProblemDepth,
  tool: string
): DemandEvidence[] {
  const marketplaceHits = countMarketplaceDocs(
    docs,
    `${tool} ${problem.problem}`
  );
  const out: DemandEvidence[] = [];
  const ids = evidence.slice(0, 3).map((e) => e.id);

  if (marketplaceHits > 0) {
    out.push({
      kind: "direct_marketplace",
      summary: `${marketplaceHits} observable marketplace listing(s) touched this tool/problem theme.`,
      evidenceIds: ids,
    });
  }

  out.push({
    kind: "public_problem",
    summary: `Problem language (“${problem.problem}”) appeared in collected public/curated sources.`,
    evidenceIds: problem.evidenceIds.length ? problem.evidenceIds : ids,
  });

  if (marketplaceHits === 0) {
    out.push({
      kind: "indirect_demand",
      summary:
        "Demand is inferred from public problem language + tool association; no direct marketplace listing match in this pass.",
      evidenceIds: ids,
    });
  }

  return out;
}

/**
 * Build up to 4 distinct micro-niche opportunities from problem×tool×service combinations.
 */
export function buildMicroNicheOpportunities(input: {
  coreService: string;
  problems: ProblemDepth[];
  tools: NicheTag[];
  tags: NicheTag[];
  buyers: string[];
  services: string[];
  docs: CollectedDocument[];
  evidence: ResearchEvidence[];
}): MicroNicheOpportunity[] {
  const opportunities: MicroNicheOpportunity[] = [];
  const tools =
    input.tools.length > 0
      ? input.tools
      : [
          {
            tag: input.coreService,
            type: "tool" as const,
            parentConcept: input.coreService,
            evidenceIds: [],
            confidence: "weak" as const,
            reasonItMatters: "Fallback to core service when no tool extracted.",
            researched: false,
            tooGeneric: true,
          },
        ];

  let idx = 0;
  for (const tool of tools.slice(0, 4)) {
    for (const problem of input.problems.slice(0, 3)) {
      if (opportunities.length >= 4) break;
      const buyer =
        input.buyers[idx % Math.max(1, input.buyers.length)] ||
        `Teams using ${tool.tag}`;
      const service =
        input.services[idx % Math.max(1, input.services.length)] ||
        `${tool.tag} ${problem.problem} fix`;

      const cluster = buildCluster(input.tags, tool.tag, problem.problem, service);
      if (cluster.length < 4) {
        // pad carefully with related researched tags only
        for (const t of input.tags) {
          if (cluster.length >= 4) break;
          if (
            t.relatedTool === tool.tag ||
            t.relatedProblem === problem.problem ||
            t.type === "outcome" ||
            t.type === "buyer_intent"
          ) {
            if (!cluster.includes(t.tag)) cluster.push(t.tag);
          }
        }
      }
      if (cluster.length < 4) continue;

      const listingCount = countMarketplaceDocs(
        input.docs,
        `${tool.tag} ${problem.problem}`
      );
      const specificity =
        (tool.tooGeneric ? 0 : 1) +
        (problem.problem.split(/\s+/).length > 1 ? 1 : 0) +
        (cluster.length >= 4 ? 1 : 0);

      const competition = competitionFromCount(listingCount, specificity);
      const demandEvidence = demandForNiche(
        input.docs,
        input.evidence,
        problem,
        tool.tag
      );

      const depth: ProblemDepth = {
        ...problem,
        who: buyer,
        toolPlatform: tool.tag,
        serviceRequired: `Provide ${service} focused on ${problem.problem.toLowerCase()} for ${tool.tag}`,
      };

      opportunities.push({
        id: `niche_${idx + 1}`,
        title: `${tool.tag} · ${problem.problem}`,
        buyer,
        problem: problem.problem,
        toolPlatform: tool.tag,
        service: titleCase(service),
        desiredOutcome: problem.desiredOutcome,
        positioning: `Help ${buyer.toLowerCase()} solve ${problem.problem.toLowerCase()} on ${tool.tag} — not a generic ${input.coreService} offer.`,
        tagCluster: cluster.slice(0, 6),
        whyTagsBelongTogether: `These tags share the ${tool.tag} + ${problem.problem} buyer journey (tool, problem, service, outcome).`,
        sharedBuyerIntent: problem.desiredOutcome,
        competition,
        demandEvidence,
        problemDepth: depth,
        confidence:
          competition.level === "stronger_niche_signal"
            ? "moderate"
            : competition.level === "moderate_niche_signal"
              ? "moderate"
              : competition.level === "insufficient_evidence"
                ? "insufficient"
                : "weak",
        evidenceIds: [
          ...tool.evidenceIds,
          ...problem.evidenceIds,
        ].slice(0, 5),
      });
      idx += 1;
    }
  }

  return opportunities.slice(0, 4);
}

function buildCluster(
  tags: NicheTag[],
  tool: string,
  problem: string,
  service: string
): string[] {
  const cluster: string[] = [];
  const add = (v: string) => {
    if (!v) return;
    if (!cluster.some((c) => c.toLowerCase() === v.toLowerCase())) {
      cluster.push(v);
    }
  };
  add(tool);
  add(problem);
  add(service);
  for (const t of tags) {
    if (cluster.length >= 5) break;
    if (
      t.relatedTool?.toLowerCase() === tool.toLowerCase() ||
      t.relatedProblem?.toLowerCase() === problem.toLowerCase()
    ) {
      add(t.tag);
    }
  }
  return cluster;
}

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
