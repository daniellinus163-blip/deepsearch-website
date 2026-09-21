import {
  CATEGORY_FALLBACKS,
  SERVICE_CATALOG,
  type DiscoveryProfile,
} from "@/lib/discovery/catalog";
import { isGenericNoise } from "@/lib/research/filters";

const INTENT_PREFIXES = [
  /^i\s+want\s+to\s+sell\s+/i,
  /^i'?d\s+like\s+to\s+sell\s+/i,
  /^looking\s+to\s+sell\s+/i,
  /^help\s+me\s+sell\s+/i,
  /^i\s+offer\s+/i,
  /^i\s+provide\s+/i,
  /^selling\s+/i,
  /^sell\s+/i,
];

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function normalizeServiceQuery(raw: string): string {
  let cleaned = raw.trim().replace(/\s+/g, " ");
  for (const pattern of INTENT_PREFIXES) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(/[?.!]+$/g, "").trim();
  return cleaned;
}

function scoreCatalogMatch(normalized: string, keywords: string[]): number {
  const haystack = normalized.toLowerCase();
  let best = 0;
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    if (haystack === needle) {
      best = Math.max(best, 100);
    } else if (haystack.includes(needle)) {
      best = Math.max(best, 70 + needle.length);
    } else {
      const parts = needle.split(/\s+/).filter(Boolean);
      const hitCount = parts.filter((part) => haystack.includes(part)).length;
      if (hitCount > 0) {
        best = Math.max(best, Math.round((hitCount / parts.length) * 50));
      }
    }
  }
  return best;
}

/**
 * Offline last-resort profile when deep research returns nothing usable.
 * NEVER emits basic/premium package style noise.
 */
export function buildInsufficientEvidenceProfile(
  sourceQuery: string,
  mainService: string
): DiscoveryProfile {
  const base = titleCase(mainService);
  return {
    sourceQuery,
    mainService: base,
    category: "Evidence insufficient",
    subServices: [],
    buyerTypes: [],
    useCases: [],
    matchedCatalog: null,
  };
}

export function tryCatalogMatch(rawQuery: string): {
  profile: DiscoveryProfile | null;
  normalized: string;
  bestScore: number;
} {
  const sourceQuery = rawQuery.trim();
  const normalized = normalizeServiceQuery(sourceQuery);
  if (!normalized) {
    return { profile: null, normalized: "", bestScore: 0 };
  }

  let bestEntry = null as (typeof SERVICE_CATALOG)[number] | null;
  let bestScore = 0;

  for (const entry of SERVICE_CATALOG) {
    const score = scoreCatalogMatch(normalized, entry.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry && bestScore >= 45) {
    return {
      normalized,
      bestScore,
      profile: {
        sourceQuery,
        mainService: bestEntry.mainService,
        category: bestEntry.category,
        subServices: bestEntry.subServices.filter((s) => !isGenericNoise(s)),
        buyerTypes: bestEntry.buyerTypes.filter((s) => !isGenericNoise(s)),
        useCases: bestEntry.useCases.filter((s) => !isGenericNoise(s)),
        matchedCatalog: bestEntry.id,
      },
    };
  }

  return { profile: null, normalized, bestScore };
}

/**
 * Legacy sync discovery — prefers catalog; otherwise insufficient-evidence stub.
 * Deep research should be used via runDeepResearch for real recommendations.
 */
export function discoverService(rawQuery: string): DiscoveryProfile {
  const sourceQuery = rawQuery.trim();
  if (!sourceQuery) {
    throw new Error("Enter what you want to sell.");
  }

  const { profile, normalized } = tryCatalogMatch(sourceQuery);
  if (!normalized) {
    throw new Error("Could not understand that service. Try being more specific.");
  }
  if (profile) return profile;

  // Soft category hint only — still no package templates
  const lower = normalized.toLowerCase();
  const fallback = CATEGORY_FALLBACKS.find((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword))
  );

  if (!fallback) {
    return buildInsufficientEvidenceProfile(sourceQuery, normalized);
  }

  const base = titleCase(normalized);
  return {
    sourceQuery,
    mainService: base,
    category: fallback.category,
    subServices: [],
    buyerTypes: fallback.buyerTemplates.filter((t) => !isGenericNoise(t)),
    useCases: fallback.useCaseTemplates.filter((t) => !isGenericNoise(t)),
    matchedCatalog: null,
  };
}
