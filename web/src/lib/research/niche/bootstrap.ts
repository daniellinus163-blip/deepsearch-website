import type { CollectedDocument } from "@/lib/research/types";

/**
 * Bootstrap evidence from the starting query itself.
 * Ensures tool/problem extraction can begin even when network sources are empty.
 * Labeled curated_knowledge / inferred — not marketplace proof.
 */
export function bootstrapDocumentsFromQuery(query: string): CollectedDocument[] {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const notes: string[] = [
    `Starting research query: ${q}`,
    "Bootstrap analysis from the query text (not private marketplace data).",
  ];

  const toolHits: string[] = [];
  const toolMap: Array<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/\bshopify\b/i, "Shopify"],
    [/\bwoocommerce\b/i, "WooCommerce"],
    [/\bwordpress\b/i, "WordPress"],
    [/\bwebflow\b/i, "Webflow"],
    [/\breact\b/i, "React"],
    [/\bnext\.?js\b/i, "Next.js"],
    [/\bfirebase\b/i, "Firebase"],
    [/\bsupabase\b/i, "Supabase"],
    [/\broblox\b/i, "Roblox"],
    [/\bdiscord\b/i, "Discord"],
    [/\bslack\b/i, "Slack"],
    [/\bgithub\b/i, "GitHub"],
    [/\bzapier\b/i, "Zapier"],
  ];
  for (const [re, label] of toolMap) {
    if (re.test(q)) toolHits.push(label);
  }

  const problemHits: string[] = [];
  if (/\bwebhook\b/i.test(q)) {
    problemHits.push("Webhook failures");
    notes.push(
      "Query includes webhook — common service needs: verify signature, retry handling, endpoint setup, event mapping."
    );
  }
  if (/\bcheckout\b/i.test(q)) problemHits.push("Checkout failures");
  if (/\bpayment\b/i.test(q)) problemHits.push("Payment problems");
  if (/\bintegrat/i.test(q)) problemHits.push("Integration issues");
  if (/\bapi\b/i.test(q)) problemHits.push("API errors");
  if (/\bauth/i.test(q)) problemHits.push("Authentication problems");
  if (/\bmigrat/i.test(q)) problemHits.push("Migration problems");
  if (/\bsetup\b|\binstall\b/i.test(q)) problemHits.push("Setup / onboarding friction");
  if (/\bbug\b|\bfix\b|\berror\b/i.test(q)) problemHits.push("Bugs / errors to fix");
  if (/\bautomat/i.test(q)) problemHits.push("Automation gaps");

  if (toolHits.length) {
    notes.push(`Tools/platforms detected in query: ${toolHits.join(", ")}`);
  }
  if (problemHits.length) {
    notes.push(`Problem themes detected in query: ${problemHits.join(", ")}`);
  }

  // Service framing
  notes.push(
    `Potential freelance service framing: help buyers implement/fix/configure aspects of "${q}" rather than selling the bare term alone.`
  );

  if (/\bstripe\b/i.test(lower) && /\bwebhook\b/i.test(lower)) {
    notes.push(
      "Stripe webhook commonly involves endpoint URL setup, signing secret verification, event types (payment_intent, checkout.session), local testing with Stripe CLI, and production retry/idempotency issues."
    );
    notes.push(
      "Buyer intent examples (inferred from common public docs patterns, not Fiverr private data): webhook not firing, signature verification failed, duplicate events, localhost tunneling."
    );
    if (!problemHits.includes("Webhook failures")) {
      problemHits.push("Webhook failures");
    }
    if (!problemHits.includes("Integration issues")) {
      problemHits.push("Integration issues");
    }
    if (!problemHits.includes("Authentication problems")) {
      problemHits.push("Authentication problems");
    }
  }

  return [
    {
      adapter: "query_bootstrap",
      title: `Query bootstrap: ${q}`,
      text: [
        ...notes,
        toolHits.length ? `Tools: ${toolHits.join("; ")}` : "",
        problemHits.length ? `Problems: ${problemHits.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      kind: "curated_knowledge",
      meta: {
        tools: toolHits,
        problems: problemHits,
        note: "Bootstrap from query — validate with public sources when available.",
      },
    },
  ];
}
