/**
 * E2E niche research: technical service input (not Roblox).
 * Usage: npx --yes tsx scripts/test-niche-stripe.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnvLocal();
  const { runDeepResearch, reportConfidenceSummary } = await import(
    "../src/lib/research/orchestrator"
  );
  const { buildMultiGigsFromResearch } = await import(
    "../src/lib/gig/multi-from-research"
  );

  const query = "Stripe webhook";
  const { report, profile } = await runDeepResearch({
    query,
    userId: null,
    marketplaces: ["Fiverr"],
    researchDepth: "deep",
  });

  console.log(
    JSON.stringify(
      {
        query,
        core: report.coreService,
        mainService: profile.mainService,
        depth: report.researchDepth,
        confidence: reportConfidenceSummary(report),
        tools: report.discoveredTools.map((t) => t.label),
        problems: report.problemDepths.map((p) => p.problem).slice(0, 8),
        tagPoolSize: report.nicheTagPool.length,
        tagTypes: [...new Set(report.nicheTagPool.map((t) => t.type))],
        relationships: report.tagRelationships.length,
        niches: report.microNiches.map((n) => ({
          title: n.title,
          cluster: n.tagCluster,
          competition: n.competition.level,
          demand: n.demandEvidence.map((d) => d.kind),
        })),
        fiverrNote: report.fiverrLimitationNote.slice(0, 120),
        adapters: report.adaptersUsed,
        evidenceCount: report.evidence.length,
      },
      null,
      2
    )
  );

  const multi = await buildMultiGigsFromResearch(report);
  console.log(
    JSON.stringify(
      {
        gigCount: multi.gigs.length,
        gigs: multi.gigs.map((g) => ({
          niche: g.nicheTitle,
          title: g.gig.title,
          titleLen: g.gig.title.length,
          tags: g.gig.tags,
          descLen: g.gig.description.length,
          packages: g.gig.packages.map((p) => p.name),
          competition: g.explanation.competitionSignal.slice(0, 140),
          provider: g.provider,
        })),
      },
      null,
      2
    )
  );

  if (!report.discoveredTools.some((t) => /stripe/i.test(t.label))) {
    console.error("WARN: Stripe tool not extracted");
    process.exitCode = 2;
  }
  if (report.microNiches.length < 1) {
    console.error("FAIL: no micro niches");
    process.exitCode = 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
