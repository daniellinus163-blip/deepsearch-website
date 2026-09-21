import type {
  IntentCategory,
  IntentClassification,
  IntentClassifyContext,
} from "@/lib/intent/types";

type AudienceRule = { pattern: RegExp; label: string };
type UseCaseRule = { pattern: RegExp; label: string };
type FeatureRule = { pattern: RegExp; label: string };

const AUDIENCE_RULES: AudienceRule[] = [
  { pattern: /\byoutube\b|\byt\b/i, label: "YouTube creator" },
  { pattern: /\bvtuber\b|\bstreamer\b|\btwitchitch\b/i, label: "Streamer / VTuber" },
  { pattern: /\bgame\s*dev|\bdeveloper\b|\bstudio\b/i, label: "Game developer" },
  { pattern: /\bugc\b/i, label: "UGC creator" },
  { pattern: /\bbusiness\b|\bstartup\b|\bcompany\b|\bbrand\b/i, label: "Business / brand" },
  { pattern: /\bcoach\b|\bconsultant\b|\bagency\b/i, label: "Coach / consultant / agency" },
  { pattern: /\becommerce\b|\be-commerce\b|\bshop\b|\bstore\b/i, label: "E-commerce seller" },
  { pattern: /\bcontent\s*creator\b|\bcreator\b/i, label: "Content creator" },
  { pattern: /\bplayer\b|\bgamer\b/i, label: "Player / gamer" },
];

const USE_CASE_RULES: UseCaseRule[] = [
  { pattern: /\bfor\s+youtube\b|\bcontent\s+creation\b|\bthumbnail\b/i, label: "Content creation" },
  { pattern: /\bbranding\b|\bbrand\s+identity\b|\blogo\b/i, label: "Branding" },
  { pattern: /\blanding\s+page\b|\blead\s+gen|\bconversion\b/i, label: "Lead generation / conversion" },
  { pattern: /\bin[- ]?game\b|\bgame\s+character\b|\bavater\b|\bavatar\b/i, label: "In-game / avatar identity" },
  { pattern: /\bstream(ing)?\b|\bvtuber\b/i, label: "Streaming presence" },
  { pattern: /\bugc\b|\bmarketplace\b/i, label: "UGC / marketplace listing" },
  { pattern: /\bproduct\s+launch\b|\blaunch\b/i, label: "Product launch" },
  { pattern: /\bportfolio\b|\bpersonal\s+brand\b/i, label: "Portfolio / personal brand" },
  { pattern: /\bsocial\s+media\b|\binstagram\b|\btiktok\b/i, label: "Social media growth" },
];

const FEATURE_RULES: FeatureRule[] = [
  { pattern: /\bdynamic\s+head\b/i, label: "Dynamic Head" },
  { pattern: /\bfurry\b/i, label: "Furry style" },
  { pattern: /\bugc\b/i, label: "UGC-ready" },
  { pattern: /\bcustom\b/i, label: "Custom / bespoke" },
  { pattern: /\bminimal(ist)?\b/i, label: "Minimalist style" },
  { pattern: /\bmascot\b/i, label: "Mascot" },
  { pattern: /\bwordpress\b|\bno[- ]?code\b/i, label: "WordPress / no-code" },
  { pattern: /\bfigma\b/i, label: "Figma workflow" },
  { pattern: /\bseo\b/i, label: "SEO-focused" },
  { pattern: /\bshort[- ]?form\b|\breels?\b|\btiktok\b/i, label: "Short-form format" },
];

const PROBLEM_PATTERNS = [
  /\bfix\b/i,
  /\brewrite\b/i,
  /\bredesign\b/i,
  /\bimprove\b/i,
  /\boptimize\b/i,
  /\bstruggling\b/i,
  /\bneed\s+help\b/i,
  /\bbroken\b/i,
  /\bupdate\b/i,
];

const OUTCOME_PATTERNS = [
  /\bmore\s+clicks?\b/i,
  /\bmore\s+sales?\b/i,
  /\bgrow(th|ing)?\b/i,
  /\brank(ing)?\b/i,
  /\bconvert\b/i,
  /\bprofessional\b/i,
  /\bstand\s+out\b/i,
  /\bget\s+clients?\b/i,
];

const PURCHASE_PATTERNS = [
  /\bhire\b/i,
  /\bbuy\b/i,
  /\border\b/i,
  /\bneed\b/i,
  /\blooking\s+for\b/i,
  /\bwant\b/i,
  /\bfor\s+my\b/i,
  /\bget\s+me\b/i,
  /\bcommission\b/i,
];

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return clean(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function matchFirst<T extends { pattern: RegExp; label: string }>(
  term: string,
  rules: T[]
): T | null {
  return rules.find((rule) => rule.pattern.test(term)) ?? null;
}

function inferServiceLabel(
  term: string,
  context: IntentClassifyContext
): string | null {
  if (context.mainService) return titleCase(context.mainService);

  const lowered = term.toLowerCase();
  const known = [
    "character design",
    "logo design",
    "thumbnail",
    "website",
    "copywriting",
    "video editing",
    "social media",
    "ui ux",
    "ui/ux",
  ];
  for (const item of known) {
    if (lowered.includes(item)) return titleCase(item);
  }

  // Fallback: strip audience/use-case "for X" tail
  const withoutFor = term.replace(/\s+for\s+.+$/i, "").trim();
  return withoutFor ? titleCase(withoutFor) : null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

/**
 * Phase 6 Buyer Intent Engine — rule-based classification (no AI).
 * Answers: what does the buyer actually want?
 */
export function classifyBuyerIntent(
  rawTerm: string,
  context: IntentClassifyContext = {}
): IntentClassification {
  const term = clean(rawTerm);
  if (!term) {
    throw new Error("Enter a term to classify.");
  }

  const signals: string[] = [];
  const categories = new Set<IntentCategory>();

  const audienceRule = matchFirst(term, AUDIENCE_RULES);
  const useCaseRule = matchFirst(term, USE_CASE_RULES);
  const featureRule = matchFirst(term, FEATURE_RULES);
  const hasProblem = PROBLEM_PATTERNS.some((p) => p.test(term));
  const hasOutcome = OUTCOME_PATTERNS.some((p) => p.test(term));
  const hasPurchase = PURCHASE_PATTERNS.some((p) => p.test(term));
  const hasForClause = /\bfor\b/i.test(term);
  const wordCount = term.split(/\s+/).filter(Boolean).length;

  if (audienceRule) {
    categories.add("audience");
    signals.push(`audience:${audienceRule.label}`);
  }
  if (useCaseRule) {
    categories.add("use_case");
    signals.push(`use_case:${useCaseRule.label}`);
  }
  if (featureRule) {
    categories.add("feature");
    signals.push(`feature:${featureRule.label}`);
  }
  if (hasProblem) {
    categories.add("problem");
    signals.push("problem:signal");
  }
  if (hasOutcome) {
    categories.add("outcome");
    signals.push("outcome:signal");
  }
  if (hasPurchase) {
    categories.add("purchase_ready");
    signals.push("purchase:signal");
  }

  // Specific service if close to main service or multi-word service phrasing
  const main = context.mainService?.toLowerCase() ?? "";
  if (
    (main && term.toLowerCase().includes(main.split(" ")[0])) ||
    wordCount >= 2
  ) {
    categories.add("specific_service");
    signals.push("service:specific");
  }

  if (categories.size === 0) {
    categories.add("general");
    signals.push("fallback:general");
  }

  // Primary category priority (purchase-ready wins when present)
  const priority: IntentCategory[] = [
    "purchase_ready",
    "audience",
    "use_case",
    "problem",
    "outcome",
    "feature",
    "specific_service",
    "general",
  ];
  const primaryCategory =
    priority.find((c) => categories.has(c)) ?? "general";

  const audience =
    audienceRule?.label ||
    (hasForClause
      ? extractAfterFor(term, "audience")
      : context.buyerTypes?.[0] ?? null);

  const useCase =
    useCaseRule?.label ||
    (hasForClause && !audienceRule
      ? extractAfterFor(term, "use_case")
      : context.useCases?.[0] ?? null);

  const serviceLabel = inferServiceLabel(term, context);

  let intentLabel = "exploratory";
  if (categories.has("purchase_ready")) intentLabel = "purchase-oriented";
  else if (categories.has("problem")) intentLabel = "problem-solving";
  else if (categories.has("outcome")) intentLabel = "outcome-seeking";
  else if (categories.has("audience") || categories.has("use_case")) {
    intentLabel = "context-specific";
  } else if (categories.has("feature")) intentLabel = "feature-seeking";
  else if (categories.has("specific_service")) intentLabel = "service-seeking";

  const problem = hasProblem
    ? `Buyer may be trying to fix or improve an existing ${serviceLabel?.toLowerCase() ?? "result"}`
    : null;

  const outcome = hasOutcome
    ? "Buyer wants a measurable improvement (growth, clicks, conversion, or professionalism)"
    : audience || useCase
      ? `Buyer wants a result suited to ${audience || useCase}`
      : null;

  let confidence = 0.35;
  confidence += categories.size * 0.08;
  if (audienceRule) confidence += 0.12;
  if (useCaseRule) confidence += 0.1;
  if (featureRule) confidence += 0.08;
  if (hasPurchase) confidence += 0.12;
  if (main && term.toLowerCase().includes(main.split(" ")[0])) confidence += 0.08;

  return {
    term,
    primaryCategory,
    categories: [...categories],
    audience: audience ? titleCase(String(audience)) : null,
    useCase: useCase ? titleCase(String(useCase)) : null,
    serviceLabel,
    intentLabel,
    problem,
    outcome,
    confidence: clamp01(confidence),
    signals,
  };
}

function extractAfterFor(
  term: string,
  mode: "audience" | "use_case"
): string | null {
  const match = term.match(/\bfor\s+(.+)$/i);
  if (!match?.[1]) return null;
  const tail = clean(match[1]);
  if (!tail) return null;
  if (mode === "audience") return titleCase(tail);
  return titleCase(tail);
}

export function classifyMany(
  terms: string[],
  context: IntentClassifyContext = {}
): IntentClassification[] {
  const seen = new Set<string>();
  const results: IntentClassification[] = [];
  for (const term of terms) {
    const key = clean(term).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(classifyBuyerIntent(term, context));
  }
  return results;
}
