/**
 * E2E: Fiverr marketplace research for "Roblox"
 * Usage: npx --yes tsx scripts/test-fiverr-research.ts
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
  const { buildGigFromResearch } = await import("../src/lib/gig/from-research");

  const { report, profile } = await runDeepResearch({
    query: "Roblox",
    userId: null,
    marketplaces: ["Fiverr"],
  });

  const fiverrAdapters = report.adaptersUsed.filter((a) =>
    a.includes("marketplace:fiverr")
  );
  const banned = [/basic\s+package/i, /premium\s+package/i, /with\s+revisions/i];
  const labels = [
    ...profile.subServices,
    ...report.serviceBranches.map((b) => b.label),
  ];
  const bannedHits = labels.filter((l) => banned.some((b) => b.test(l)));

  console.log(
    JSON.stringify(
      {
        core: report.coreService,
        mainService: profile.mainService,
        marketplaces: report.marketplaces,
        fiverrAdapters,
        confidence: reportConfidenceSummary(report),
        branches: report.serviceBranches.map((b) => b.label).slice(0, 6),
        whyBuyersNeed: report.whyBuyersNeed.slice(0, 2).map((w) => ({
          need: w.buyerNeed,
          problem: w.problem,
        })),
        termTypes: [
          ...new Set(report.searchTermHierarchy.map((t) => t.type)),
        ],
        evidenceFromFiverr: report.evidence.filter((e) =>
          e.source.includes("fiverr")
        ).length,
        bannedHits,
        reasoningProvider: report.reasoningProvider,
      },
      null,
      2
    )
  );

  const gig = await buildGigFromResearch(report, profile.mainService);
  console.log(
    JSON.stringify(
      {
        gigProvider: gig.provider,
        title: gig.gig.title,
        tags: gig.gig.tags,
        primaryTerm: gig.explanation.primaryTerm,
        packages: gig.gig.packages.map((p) => p.name),
        startingVsTitle: {
          start: report.query,
          title: gig.gig.title,
          sameAsBareTag: gig.gig.title.toLowerCase() === "roblox",
        },
      },
      null,
      2
    )
  );

  if (!fiverrAdapters.length) process.exitCode = 2;
  if (bannedHits.length) process.exitCode = 3;
  if (gig.gig.title.toLowerCase() === "roblox") process.exitCode = 4;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
