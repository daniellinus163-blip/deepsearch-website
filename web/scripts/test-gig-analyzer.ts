/**
 * Smoke test: paste-based analyzer → boost tags → rephrase.
 * Run: npx tsx scripts/test-gig-analyzer.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // ignore
}

async function main() {
  const { collectGigFromPaste } = await import("../src/lib/analyzer/collect");
  const { auditGigSnapshot } = await import("../src/lib/analyzer/audit");
  const { rephraseGigTitle, rephraseGigDescription } = await import(
    "../src/lib/analyzer/rephrase"
  );

  console.log("1) Paste-only snapshot");
  const snapshot = await collectGigFromPaste({
    title: "I will fix Stripe webhook errors and payment confirmation bugs",
    description:
      "Having trouble with Stripe webhooks returning 400 errors, duplicate events, or missing payment confirmations? I debug signature verification, endpoint setup, and event handling so your checkout reliably marks orders paid.",
    tags: ["stripe webhook", "stripe payment", "webhook error"],
  });
  console.log("  status:", snapshot.retrievalStatus);

  console.log("2) Audit + boost tags");
  const audit = await auditGigSnapshot(snapshot);
  const boost = audit.suggestedBoostTags ?? [];
  console.log("  boost tag count:", boost.length);
  console.log(
    "  tags:",
    boost.map((t) => `${t.tag}(${t.kind})`).join(", ")
  );
  if (boost.length === 0 || boost.length > 10) {
    throw new Error(`Expected 1-10 boost tags, got ${boost.length}`);
  }

  console.log("3) Rephrase title/description");
  const title = await rephraseGigTitle({
    title: snapshot.title!,
    description: snapshot.description!,
    currentTags: snapshot.tags,
    boostTags: boost,
  });
  const desc = await rephraseGigDescription({
    title: title.title,
    description: snapshot.description!,
    currentTags: snapshot.tags,
    boostTags: boost,
  });
  console.log("  title:", title.title);
  console.log("  title provider:", title.provider);
  console.log("  desc chars:", desc.description.length);
  console.log("  desc provider:", desc.provider);

  console.log("\nPASS");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
