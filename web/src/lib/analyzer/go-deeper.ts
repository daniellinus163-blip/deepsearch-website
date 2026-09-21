import { snapshotToResearchSeed } from "@/lib/analyzer/collect";
import type {
  AnalyzerDeepResult,
  GigAuditReport,
  GigSnapshot,
  MissingResearchItem,
  TagCluster,
} from "@/lib/analyzer/types";
import {
  reportConfidenceSummary,
  runDeepResearch,
} from "@/lib/research/orchestrator";
import type { DeepResearchReport } from "@/lib/research/types";

function buildResearchQuery(
  snapshot: GigSnapshot,
  audit: GigAuditReport
): string {
  const bits = [
    snapshot.title,
    ...snapshot.tags.slice(0, 6),
    /not fully explicit|candidate for deeper/i.test(audit.mainProblem)
      ? ""
      : audit.mainProblem,
    audit.targetBuyer.includes("Not clearly evidenced") ? "" : audit.targetBuyer,
  ]
    .filter(Boolean)
    .join(" ");
  return bits.trim() || snapshotToResearchSeed(snapshot);
}

function findMissing(
  snapshot: GigSnapshot,
  audit: GigAuditReport,
  report: DeepResearchReport
): MissingResearchItem[] {
  const missing: MissingResearchItem[] = [];
  const blob = [
    snapshot.title,
    snapshot.description,
    ...snapshot.tags,
    JSON.stringify(snapshot.faqs),
  ]
    .join(" ")
    .toLowerCase();

  for (const p of report.problemDepths.slice(0, 6)) {
    if (!blob.includes(p.problem.toLowerCase().split(" ")[0] ?? "")) {
      missing.push({
        category: "problem",
        item: p.problem,
        why: "Appears in deep research but not clearly reflected in the current gig snapshot.",
        evidence: p.evidence,
      });
    }
  }

  for (const t of report.discoveredTools.slice(0, 5)) {
    if (!blob.includes(t.label.toLowerCase())) {
      missing.push({
        category: "tool",
        item: t.label,
        why: "Tool/platform discovered in research is not visible in current gig positioning.",
        evidence: t.why,
      });
    }
  }

  for (const u of report.useCases.slice(0, 5)) {
    if (!blob.includes(u.label.toLowerCase().split(" ")[0] ?? "")) {
      missing.push({
        category: "use_case",
        item: u.label,
        why: "Use case discovered in research may be missing from the current offer narrative.",
        evidence: u.why,
      });
    }
  }

  for (const need of report.whyBuyersNeed.slice(0, 4)) {
    missing.push({
      category: "buyer_need",
      item: need.buyerNeed,
      why: need.whyItMatters,
      evidence: need.evidence,
    });
  }

  for (const area of audit.areasForDeeperResearch.slice(0, 3)) {
    missing.push({
      category: "positioning",
      item: area,
      why: "Flagged during initial audit as needing deeper research.",
      evidence: "Initial gig audit",
    });
  }

  // Dedupe by item
  const seen = new Set<string>();
  return missing.filter((m) => {
    const key = `${m.category}:${m.item.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

function buildClusters(report: DeepResearchReport): TagCluster[] {
  return report.microNiches.slice(0, 4).map((n, i) => ({
    name: `Cluster ${String.fromCharCode(65 + i)} · ${n.title}`,
    tags: n.tagCluster,
    sharedBuyerIntent: n.sharedBuyerIntent,
    whyTogether: n.whyTagsBelongTogether,
  }));
}

/**
 * Go Deeper: start a new deep research session seeded by the audited gig.
 */
export async function goDeeperFromGig(input: {
  snapshot: GigSnapshot;
  audit: GigAuditReport;
  userId?: string | null;
  marketplaces?: string[];
}): Promise<{ result: AnalyzerDeepResult; report: DeepResearchReport }> {
  const researchQuery = buildResearchQuery(input.snapshot, input.audit);

  const { report } = await runDeepResearch({
    query: researchQuery,
    userId: input.userId,
    marketplaces: input.marketplaces?.length
      ? input.marketplaces
      : ["Fiverr"],
    researchDepth: "deep",
  });

  const result: AnalyzerDeepResult = {
    researchQuery,
    deepReport: report,
    missing: findMissing(input.snapshot, input.audit, report),
    tagClusters: buildClusters(report),
    competitorPatterns: report.competitorObservations.map(
      (c) => `${c.label}: ${c.why}`
    ),
    confidenceSummary: reportConfidenceSummary(report),
  };

  return { result, report };
}
