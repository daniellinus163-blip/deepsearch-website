import {
  KEYWORD_CATALOG_SEEDS,
  type KeywordBuildInput,
  type KeywordDraft,
  type KeywordLevel,
} from "@/lib/keywords/types";
import { isGenericNoise } from "@/lib/research/filters";

function cleanTerm(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return cleanTerm(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function wordCount(term: string): number {
  return cleanTerm(term).split(/\s+/).filter(Boolean).length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

/**
 * Heuristic attributes — not marketplace official scores.
 * Broader terms → higher competition signal; longer/more specific → higher specificity.
 */
function scoreAttributes(
  term: string,
  level: KeywordLevel,
  mainService: string
): Pick<
  KeywordDraft,
  | "relevance"
  | "specificity"
  | "competitionSignal"
  | "buyerIntent"
  | "relationshipToService"
> {
  const words = wordCount(term);
  const mainLower = mainService.toLowerCase();
  const termLower = term.toLowerCase();

  const overlap = mainLower
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => termLower.includes(w)).length;
  const mainWords = Math.max(1, wordCount(mainService));
  const relevanceBase = overlap / mainWords;

  const levelBoost: Record<KeywordLevel, number> = {
    core: 1,
    primary: 0.92,
    secondary: 0.8,
    long_tail: 0.72,
    buyer_intent: 0.85,
  };

  const specificity = clamp01(
    (words / 8) * 0.7 +
      (level === "long_tail" || level === "buyer_intent" ? 0.35 : 0.1) +
      (level === "secondary" ? 0.15 : 0)
  );

  const competitionSignal = clamp01(
    1 -
      specificity * 0.65 -
      (level === "buyer_intent" ? 0.15 : 0) -
      (level === "long_tail" ? 0.1 : 0) +
      (level === "core" ? 0.2 : 0)
  );

  let buyerIntent = "general";
  if (level === "buyer_intent") buyerIntent = "purchase-oriented";
  else if (/for |hire |need |want /i.test(term)) buyerIntent = "purchase-oriented";
  else if (level === "long_tail") buyerIntent = "specific-need";
  else if (level === "secondary") buyerIntent = "feature-oriented";
  else if (level === "primary") buyerIntent = "service-seeking";
  else buyerIntent = "exploratory";

  let relationshipToService = "related";
  if (level === "core") relationshipToService = "core-service";
  else if (level === "primary") relationshipToService = "primary-variant";
  else if (level === "secondary") relationshipToService = "sub-service";
  else if (level === "long_tail") relationshipToService = "niche-variant";
  else if (level === "buyer_intent") relationshipToService = "audience-use-case";

  return {
    relevance: clamp01(relevanceBase * 0.6 + levelBoost[level] * 0.4),
    specificity,
    competitionSignal,
    buyerIntent,
    relationshipToService,
  };
}

function pushUnique(
  bucket: Map<string, KeywordDraft>,
  draft: Omit<KeywordDraft, "sortOrder"> & { sortOrder?: number },
  sortOrder: number
) {
  const key = draft.term.toLowerCase();
  if (!key || bucket.has(key)) return;
  bucket.set(key, { ...draft, sortOrder });
}

function shortenToCore(mainService: string): string {
  const words = cleanTerm(mainService).split(/\s+/);
  if (words.length <= 2) return titleCase(mainService);
  // Drop trailing "design/service/development" style fillers for a tighter core
  const fillers = new Set([
    "design",
    "designs",
    "service",
    "services",
    "development",
    "developer",
    "management",
    "manager",
    "editing",
    "editor",
    "writing",
    "writer",
  ]);
  const trimmed = words.filter((w, i) => i === 0 || !fillers.has(w.toLowerCase()));
  const core = trimmed.slice(0, Math.min(3, trimmed.length)).join(" ");
  return titleCase(core || mainService);
}

/**
 * Phase 5 Keyword Intelligence — deterministic hierarchy builder (no AI).
 * CORE → PRIMARY → SECONDARY → LONG-TAIL → BUYER-INTENT
 */
export function buildKeywordHierarchy(input: KeywordBuildInput): KeywordDraft[] {
  const mainService = titleCase(cleanTerm(input.mainService));
  if (!mainService) return [];

  const bucket = new Map<string, KeywordDraft>();
  const seeds = input.matchedCatalog
    ? KEYWORD_CATALOG_SEEDS[input.matchedCatalog]
    : undefined;

  const core = titleCase(seeds?.core || shortenToCore(mainService));
  pushUnique(
    bucket,
    {
      term: core,
      level: "core",
      parentTerm: null,
      ...scoreAttributes(core, "core", mainService),
    },
    0
  );

  const primaryTerms = uniqueTerms([
    ...(seeds?.primary ?? []),
    mainService,
    input.category && !/^research:/i.test(input.category)
      ? `${core} ${input.category.split("/")[0].trim()}`
      : null,
  ]);

  primaryTerms.forEach((term, i) => {
    pushUnique(
      bucket,
      {
        term,
        level: "primary",
        parentTerm: core,
        ...scoreAttributes(term, "primary", mainService),
      },
      100 + i
    );
  });

  const secondaryFromSubs = (input.subServices ?? []).map((sub) => {
    const s = cleanTerm(sub);
    if (!s) return null;
    if (s.toLowerCase().includes(core.toLowerCase().split(" ")[0])) {
      return titleCase(s);
    }
    return titleCase(`${core} ${s}`);
  });

  const secondaryTerms = uniqueTerms([
    ...(seeds?.secondary ?? []),
    ...secondaryFromSubs,
    ...(input.listingTags ?? []).slice(0, 6).map((tag) => titleCase(`${core} ${tag}`)),
  ]);

  secondaryTerms.forEach((term, i) => {
    pushUnique(
      bucket,
      {
        term,
        level: "secondary",
        parentTerm: primaryTerms[0] || core,
        ...scoreAttributes(term, "secondary", mainService),
      },
      200 + i
    );
  });

  const longTailTerms = uniqueTerms([
    ...(seeds?.longTail ?? []),
    ...(input.useCases ?? [])
      .slice(0, 4)
      .map((useCase) => titleCase(`${core} for ${useCase}`)),
  ]);

  longTailTerms.forEach((term, i) => {
    pushUnique(
      bucket,
      {
        term,
        level: "long_tail",
        parentTerm: secondaryTerms[0] || primaryTerms[0] || core,
        ...scoreAttributes(term, "long_tail", mainService),
      },
      300 + i
    );
  });

  const buyerIntentTerms = uniqueTerms([
    ...(seeds?.buyerIntent ?? []),
    ...(input.buyerTypes ?? [])
      .slice(0, 5)
      .map((buyer) => titleCase(`${core} for ${buyer}`)),
    ...(input.useCases ?? [])
      .slice(0, 3)
      .map((useCase) => titleCase(`Hire ${mainService} for ${useCase}`)),
    `Hire ${mainService}`,
  ]);

  buyerIntentTerms.forEach((term, i) => {
    pushUnique(
      bucket,
      {
        term,
        level: "buyer_intent",
        parentTerm: longTailTerms[0] || secondaryTerms[0] || core,
        ...scoreAttributes(term, "buyer_intent", mainService),
      },
      400 + i
    );
  });

  return [...bucket.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

function uniqueTerms(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const term = titleCase(cleanTerm(value));
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    if (isGenericNoise(term)) continue;
    // Skip overly long noise
    if (wordCount(term) > 10) continue;
    seen.add(key);
    out.push(term);
  }
  return out;
}
