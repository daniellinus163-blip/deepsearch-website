import type { MarketplaceListing } from "@/lib/types/database";

export type CompetitionReportDraft = {
  listingsAnalyzed: number;
  commonPositioning: string[];
  commonPriceMin: number | null;
  commonPriceMax: number | null;
  commonPriceAvg: number | null;
  currency: string | null;
  commonDelivery: string[];
  repeatedBuyerLanguage: string[];
  missingPositioning: string[];
  competitionSignal: number;
  summary: string;
  rawMetrics: Record<string, unknown>;
};

function freqMap(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function topN(map: Map<string, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) =>
      term
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
}

function tokenizeTitle(title: string | null): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter(
      (w) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "your",
          "you",
          "from",
          "this",
          "that",
          "will",
          "have",
          "are",
        ].includes(w)
    );
}

/**
 * Phase 8 Competition Intelligence.
 * DeepSearch Competition Signal from observable listing fields only.
 */
export function buildCompetitionReport(
  listings: MarketplaceListing[],
  demandTerms: string[] = []
): CompetitionReportDraft {
  const analyzed = listings.length;

  if (analyzed === 0) {
    return {
      listingsAnalyzed: 0,
      commonPositioning: [],
      commonPriceMin: null,
      commonPriceMax: null,
      commonPriceAvg: null,
      currency: null,
      commonDelivery: [],
      repeatedBuyerLanguage: [],
      missingPositioning: demandTerms.slice(0, 8),
      competitionSignal: 0.2,
      summary:
        "No marketplace listings saved yet. Capture public Fiverr listings with the extension to build a DeepSearch Competition Signal.",
      rawMetrics: { note: "insufficient_observable_data" },
    };
  }

  const titleTokens = listings.flatMap((l) => tokenizeTitle(l.title));
  const tags = listings.flatMap((l) => l.tags ?? []);
  const positioningMap = freqMap([...titleTokens, ...tags]);
  const commonPositioning = topN(positioningMap, 8);

  const prices = listings
    .map((l) => (l.price_amount != null ? Number(l.price_amount) : null))
    .filter((n): n is number => n != null && Number.isFinite(n));
  const commonPriceMin = prices.length ? Math.min(...prices) : null;
  const commonPriceMax = prices.length ? Math.max(...prices) : null;
  const commonPriceAvg = prices.length
    ? Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
    : null;
  const currency =
    listings.find((l) => l.currency)?.currency ||
    (listings.find((l) => l.price_text)?.price_text?.match(/USD|EUR|GBP|\$|€|£/)?.[0] ??
      null);

  const deliveryMap = freqMap(
    listings
      .map((l) => l.delivery_time)
      .filter((v): v is string => Boolean(v))
  );
  const commonDelivery = topN(deliveryMap, 5);

  const languageMap = freqMap(
    listings.flatMap((l) => {
      const desc = l.description ?? "";
      const matches =
        desc.match(
          /\b(custom|professional|fast|premium|unique|quality|revision|deliver)\w*\b/gi
        ) ?? [];
      return matches.map((m) => m.toLowerCase());
    })
  );
  const repeatedBuyerLanguage = topN(languageMap, 8);

  const positioningLower = new Set(commonPositioning.map((p) => p.toLowerCase()));
  const missingPositioning = demandTerms
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((term) => {
      const words = term.toLowerCase().split(/\s+/);
      return !words.some((w) => w.length > 3 && positioningLower.has(w));
    })
    .slice(0, 8);

  // Heuristic DeepSearch Competition Signal (not an official marketplace score)
  const density = Math.min(1, analyzed / 25);
  const priceSpread =
    commonPriceMin != null && commonPriceMax != null && commonPriceMax > 0
      ? Math.min(1, (commonPriceMax - commonPriceMin) / commonPriceMax)
      : 0.4;
  const overlap =
    demandTerms.length === 0
      ? 0.5
      : 1 -
        missingPositioning.length / Math.max(1, Math.min(8, demandTerms.length));

  const competitionSignal = Number(
    Math.max(
      0,
      Math.min(1, density * 0.45 + overlap * 0.4 + (1 - priceSpread) * 0.15)
    ).toFixed(2)
  );

  const summary = `DeepSearch Competition Signal ${competitionSignal} from ${analyzed} observable listing${
    analyzed === 1 ? "" : "s"
  }. Common positioning: ${
    commonPositioning.slice(0, 4).join(", ") || "n/a"
  }. This is your analytical metric — not an official marketplace competition score.`;

  return {
    listingsAnalyzed: analyzed,
    commonPositioning,
    commonPriceMin,
    commonPriceMax,
    commonPriceAvg,
    currency,
    commonDelivery,
    repeatedBuyerLanguage,
    missingPositioning,
    competitionSignal,
    summary,
    rawMetrics: {
      priceCount: prices.length,
      tagCount: tags.length,
      metric: "deepsearch_competition_signal",
    },
  };
}
