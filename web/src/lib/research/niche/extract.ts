import { isGenericNoise } from "@/lib/research/filters";
import type { CollectedDocument, ResearchEvidence } from "@/lib/research/types";
import type {
  NicheTag,
  NicheTagType,
  ProblemDepth,
  TagRelationship,
} from "@/lib/research/niche/types";

const PROBLEM_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bintegrat(e|ion|ing)\b|Integration issues/i, label: "Integration issues" },
  { re: /\bapi\b.*(error|fail|issue|broken)|api error|API errors/i, label: "API errors" },
  { re: /\bauth(entication|orization)?\b.*(fail|error|issue)|oauth|jwt|Authentication problems/i, label: "Authentication problems" },
  { re: /\bwebhook\b|Webhook failures/i, label: "Webhook failures" },
  { re: /\bcheckout\b.*(fail|error|abandon|broken)|Checkout failures/i, label: "Checkout failures" },
  { re: /\bpayment\b.*(fail|error|decline|gateway)|Payment problems/i, label: "Payment problems" },
  { re: /\bmigrat(e|ion|ing)\b|Migration problems/i, label: "Migration problems" },
  { re: /\bdeploy(ment)?\b.*(fail|error|issue)|Deployment problems/i, label: "Deployment problems" },
  { re: /\bcompatib(le|ility)\b|version conflict|Compatibility issues/i, label: "Compatibility issues" },
  { re: /\bconfigur(e|ation|ing)\b.*(error|issue|wrong)|Configuration problems/i, label: "Configuration problems" },
  { re: /\bbug\b|\berror\b|\bfix\b|\bbroken\b|Bugs \/ errors/i, label: "Bugs / errors to fix" },
  { re: /\bperformance\b|slow|latency|timeout|Performance problems/i, label: "Performance problems" },
  { re: /\bsetup\b|\bonboard|Setup \/ onboarding/i, label: "Setup / onboarding friction" },
  { re: /\bautomat(e|ion|ing)\b|Automation gaps/i, label: "Automation gaps" },
  { re: /\bdatabase\b|sql|postgres|mongodb|Database issues/i, label: "Database issues" },
  { re: /\bmobile\b|\bios\b|\bandroid\b|Mobile\/web/i, label: "Mobile/web platform issues" },
];

function parseListedProblems(allText: string): string[] {
  const match = allText.match(/Problems:\s*([^\n]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(/;|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseListedTools(allText: string): string[] {
  const match = allText.match(/Tools:\s*([^\n]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(/;|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TOOL_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bstripe\b/i, label: "Stripe" },
  { re: /\bshopify\b/i, label: "Shopify" },
  { re: /\bwoocommerce\b/i, label: "WooCommerce" },
  { re: /\bwordpress\b/i, label: "WordPress" },
  { re: /\bwebflow\b/i, label: "Webflow" },
  { re: /\bfigma\b/i, label: "Figma" },
  { re: /\breact\b/i, label: "React" },
  { re: /\bnext\.?js\b/i, label: "Next.js" },
  { re: /\bnode\.?js\b/i, label: "Node.js" },
  { re: /\bfirebase\b/i, label: "Firebase" },
  { re: /\bsupabase\b/i, label: "Supabase" },
  { re: /\bmysql\b|\bpostgres\b|\bmongodb\b/i, label: "Database platform" },
  { re: /\baws\b|\bgcp\b|\bazure\b/i, label: "Cloud platform" },
  { re: /\bdocker\b|\bkubernetes\b/i, label: "Containers / orchestration" },
  { re: /\bzapier\b|\bmake\.com\b|\bn8n\b/i, label: "Automation platform" },
  { re: /\broblox\b/i, label: "Roblox" },
  { re: /\bunreal\b|\bunity\b/i, label: "Game engine" },
  { re: /\bdiscord\b/i, label: "Discord" },
  { re: /\bslack\b/i, label: "Slack" },
  { re: /\bgithub\b/i, label: "GitHub" },
];

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

export function extractProblemsFromDocuments(
  docs: CollectedDocument[],
  evidence: ResearchEvidence[],
  coreService: string
): ProblemDepth[] {
  const allText = docs.map((d) => `${d.title}\n${d.text}`).join("\n");
  const evidenceIds = evidence.slice(0, 4).map((e) => e.id);
  const out: ProblemDepth[] = [];
  const seen = new Set<string>();

  const pushProblem = (label: string, why: string, confidence: ProblemDepth["confidence"], kind: ProblemDepth["kind"]) => {
    const key = label.toLowerCase();
    if (seen.has(key) || isGenericNoise(label)) return;
    seen.add(key);
    out.push({
      problem: label,
      who: "Buyers working with the researched service / stack",
      toolPlatform: "See related tool tags from evidence",
      whyTheyNeedHelp:
        "Public/problem language suggests the issue is technical or time-consuming to resolve alone.",
      desiredOutcome: `A working ${coreService.toLowerCase()} outcome without the recurring issue`,
      serviceRequired: `Diagnose and resolve ${label.toLowerCase()} in context of ${coreService}`,
      evidence: why,
      opportunity: `Position a specific fix service around ${label.toLowerCase()} rather than a broad ${coreService} offer.`,
      confidence,
      kind,
      evidenceIds,
    });
  };

  for (const listed of parseListedProblems(allText)) {
    pushProblem(
      listed,
      "Listed in bootstrap/query or collected problem inventory.",
      "moderate",
      "curated_knowledge"
    );
  }

  for (const p of PROBLEM_PATTERNS) {
    if (!p.re.test(allText)) continue;
    if (
      p.label === "Bugs / errors to fix" &&
      !new RegExp(`${coreService.split(/\s+/)[0]}`, "i").test(allText)
    ) {
      continue;
    }
    pushProblem(
      p.label,
      `Problem language matched in collected sources for ${coreService}.`,
      "moderate",
      "inferred"
    );
  }

  return out.slice(0, 12);
}

export function extractToolsFromDocuments(
  docs: CollectedDocument[],
  evidence: ResearchEvidence[]
): NicheTag[] {
  const allText = docs.map((d) => `${d.title}\n${d.text}`).join("\n");
  const evidenceIds = evidence.slice(0, 3).map((e) => e.id);
  const tags: NicheTag[] = [];
  const seen = new Set<string>();

  const pushTool = (label: string, reason: string) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push({
      tag: label,
      type: "tool",
      parentConcept: "tool/platform",
      relatedTool: label,
      evidenceIds,
      confidence: "moderate",
      reasonItMatters: reason,
      researched: false,
      tooGeneric: false,
    });
  };

  for (const listed of parseListedTools(allText)) {
    pushTool(listed, "Tool listed in bootstrap/query inventory.");
  }

  for (const t of TOOL_PATTERNS) {
    if (!t.re.test(allText)) continue;
    pushTool(
      t.label,
      "Tool/platform name appears in collected public/curated evidence and may anchor a micro-niche."
    );
  }

  return tags;
}

export function buildNicheTagPool(input: {
  query: string;
  coreService: string;
  problems: ProblemDepth[];
  tools: NicheTag[];
  branches: string[];
  features: string[];
  buyers: string[];
  useCases: string[];
  longTails: string[];
  intentTerms: string[];
  evidenceIds: string[];
}): NicheTag[] {
  const pool: NicheTag[] = [];
  const seen = new Set<string>();

  const push = (tag: NicheTag) => {
    const key = tag.tag.toLowerCase();
    if (!tag.tag || seen.has(key) || isGenericNoise(tag.tag)) return;
    if (/^(best|cheap|custom|professional|premium|basic)\b/i.test(tag.tag)) return;
    seen.add(key);
    pool.push(tag);
  };

  push({
    tag: input.query,
    type: "service",
    parentConcept: "starting term",
    evidenceIds: input.evidenceIds.slice(0, 1),
    confidence: "strong",
    reasonItMatters: "Starting research term — not necessarily the final niche.",
    researched: true,
    tooGeneric: input.query.trim().split(/\s+/).length <= 1,
  });

  for (const p of input.problems) {
    push({
      tag: p.problem,
      type: "problem",
      parentConcept: input.coreService,
      relatedProblem: p.problem,
      relatedTool: p.toolPlatform,
      buyerIntent: p.desiredOutcome,
      evidenceIds: p.evidenceIds,
      confidence: p.confidence,
      reasonItMatters: p.opportunity,
      researched: true,
      tooGeneric: false,
    });
  }

  for (const t of input.tools) {
    push(t);
    // Combinations only when both sides exist
    for (const p of input.problems.slice(0, 3)) {
      push({
        tag: `${t.tag} ${p.problem}`.replace(/\s+/g, " ").trim(),
        type: "long_tail",
        parentConcept: t.tag,
        relatedProblem: p.problem,
        relatedTool: t.tag,
        buyerIntent: p.desiredOutcome,
        evidenceIds: [...t.evidenceIds, ...p.evidenceIds].slice(0, 4),
        confidence: "hypothesis",
        reasonItMatters:
          "Tool + problem combination — candidate micro-niche pending deeper validation.",
        researched: false,
        tooGeneric: false,
      });
    }
  }

  const typedPush = (
    labels: string[],
    type: NicheTagType,
    parent: string,
    reason: string
  ) => {
    for (const label of labels) {
      push({
        tag: titleCase(label),
        type,
        parentConcept: parent,
        evidenceIds: input.evidenceIds.slice(0, 2),
        confidence: "moderate",
        reasonItMatters: reason,
        researched: true,
        tooGeneric: false,
      });
    }
  };

  typedPush(
    input.branches,
    "service",
    input.coreService,
    "Service branch discovered from research evidence."
  );
  typedPush(
    input.features,
    "feature",
    input.coreService,
    "Feature/requirement language found in evidence."
  );
  typedPush(
    input.buyers,
    "buyer_intent",
    input.coreService,
    "Audience / buyer type from evidence."
  );
  typedPush(
    input.useCases,
    "use_case",
    input.coreService,
    "Use-case language from evidence."
  );
  typedPush(
    input.longTails,
    "long_tail",
    input.coreService,
    "Long-tail phrasing from evidence or interpretation."
  );
  typedPush(
    input.intentTerms,
    "buyer_intent",
    input.coreService,
    "Buyer-intent phrasing from evidence."
  );

  // Prefer quality: cap but allow 15+ when evidence-rich
  return pool.slice(0, 40);
}

export function buildTagRelationships(tags: NicheTag[]): TagRelationship[] {
  const rel: TagRelationship[] = [];
  const tools = tags.filter((t) => t.type === "tool" || t.type === "platform");
  const problems = tags.filter((t) => t.type === "problem");
  const outcomes = tags.filter((t) => t.type === "outcome" || t.type === "use_case");
  const services = tags.filter((t) => t.type === "service" || t.type === "long_tail");

  for (const tool of tools.slice(0, 6)) {
    for (const problem of problems.slice(0, 4)) {
      rel.push({
        from: tool.tag,
        to: problem.tag,
        reason: "Same research pass associates this tool with this problem language.",
        sharedConcept: "tool",
      });
    }
  }

  for (const problem of problems.slice(0, 5)) {
    for (const outcome of outcomes.slice(0, 3)) {
      rel.push({
        from: problem.tag,
        to: outcome.tag,
        reason: "Problem and outcome appear as linked buyer need chain.",
        sharedConcept: "outcome",
      });
    }
    for (const service of services.slice(0, 3)) {
      rel.push({
        from: problem.tag,
        to: service.tag,
        reason: "Service branch may address this researched problem.",
        sharedConcept: "problem",
      });
    }
  }

  return rel.slice(0, 40);
}

export function pickPromisingFollowUpTerms(tags: NicheTag[], limit = 5): string[] {
  return tags
    .filter(
      (t) =>
        !t.tooGeneric &&
        (t.type === "tool" ||
          t.type === "problem" ||
          t.type === "long_tail" ||
          t.type === "integration")
    )
    .slice(0, limit)
    .map((t) => t.tag);
}
