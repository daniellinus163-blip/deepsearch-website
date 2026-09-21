/**
 * Load .env.local and run deep research for "Roblox".
 * Usage: npx --yes tsx scripts/test-gemini-research.ts
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
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log("GEMINI_API_KEY configured:", hasGemini);

  const { runDeepResearch, reportConfidenceSummary } = await import(
    "../src/lib/research/orchestrator"
  );

  const { report, profile } = await runDeepResearch({
    query: "Roblox",
    userId: null,
  });

  const banned = [
    /basic\s+package/i,
    /premium\s+package/i,
    /with\s+revisions/i,
    /for a specific niche/i,
    /\bcheap\b/i,
  ];
  const labels = [
    ...profile.subServices,
    ...profile.buyerTypes,
    ...profile.useCases,
    ...report.serviceBranches.map((x) => x.label),
    ...report.nonObvious.map((x) => x.label),
  ];
  const bannedHits = labels.filter((l) => banned.some((b) => b.test(l)));

  console.log(
    JSON.stringify(
      {
        core: report.coreService,
        reasoningProvider: report.reasoningProvider,
        confidence: reportConfidenceSummary(report),
        serviceUnderstanding: report.serviceUnderstanding?.slice(0, 240),
        adapters: report.adaptersUsed,
        evidenceCount: report.evidence.length,
        branches: report.serviceBranches.map((b) => b.label).slice(0, 8),
        buyers: report.buyerTypes.map((b) => b.label).slice(0, 6),
        problems: report.buyerProblems.map((b) => b.label).slice(0, 6),
        rootNeeds: report.rootNeeds.map((b) => b.label).slice(0, 5),
        positioning: report.recommendedPositioning
          .map((b) => b.label)
          .slice(0, 4),
        bannedHits,
        notes: report.insufficientNotes.slice(0, 5),
      },
      null,
      2
    )
  );

  if (bannedHits.length) {
    process.exitCode = 2;
  }
  if (!hasGemini) {
    console.error("FAIL: GEMINI_API_KEY not loaded");
    process.exitCode = 1;
  }
  if (report.reasoningProvider !== "gemini") {
    console.error(
      "WARN: Gemini reasoning was not used. Check API key / model errors in notes."
    );
    process.exitCode = process.exitCode || 3;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
