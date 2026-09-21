import { dedupeFindingsByLabel } from "@/lib/research/filters";
import type { Finding } from "@/lib/research/types";

/**
 * Builds opportunity hypotheses from combinations — labeled as hypotheses,
 * never as measured search volume.
 */
export function analyzeOpportunities(input: {
  coreService: string;
  buyerTypes: Finding[];
  useCases: Finding[];
  features: Finding[];
  problems: Finding[];
  serviceBranches: Finding[];
}): Finding[] {
  const opportunities: Finding[] = [];
  const core = input.coreService;

  const take = <T>(arr: T[], n: number) => arr.slice(0, n);

  for (const buyer of take(input.buyerTypes, 4)) {
    for (const feature of take(input.features, 3)) {
      opportunities.push({
        label: `${core} + ${feature.label} for ${buyer.label}`,
        why: `Combination of service + feature + buyer type. Worth investigating because both feature and audience appear in evidence; this is an opportunity hypothesis, not a measured demand score.`,
        evidenceIds: [...buyer.evidenceIds, ...feature.evidenceIds].slice(0, 4),
        confidence: "hypothesis",
        kind: "opportunity_hypothesis",
      });
    }
    for (const useCase of take(input.useCases, 2)) {
      opportunities.push({
        label: `${core} for ${buyer.label} (${useCase.label})`,
        why: `Service + audience + use case combination suggested by research patterns. Hypothesis only — validate with more marketplace captures.`,
        evidenceIds: [...buyer.evidenceIds, ...useCase.evidenceIds].slice(0, 4),
        confidence: "hypothesis",
        kind: "opportunity_hypothesis",
      });
    }
  }

  for (const branch of take(input.serviceBranches, 5)) {
    if (branch.label.toLowerCase() === core.toLowerCase()) continue;
    opportunities.push({
      label: branch.label,
      why: `Service branch distinct from the bare input — may be less generic than competing on "${core}" alone.`,
      evidenceIds: branch.evidenceIds,
      confidence: branch.confidence === "strong" ? "moderate" : "hypothesis",
      kind: "opportunity_hypothesis",
    });
  }

  for (const problem of take(input.problems, 3)) {
    opportunities.push({
      label: `${core} solving: ${problem.label}`,
      why: `Problem-led positioning hypothesis based on language found in sources.`,
      evidenceIds: problem.evidenceIds,
      confidence: "hypothesis",
      kind: "opportunity_hypothesis",
    });
  }

  return dedupeFindingsByLabel(opportunities).slice(0, 12);
}
