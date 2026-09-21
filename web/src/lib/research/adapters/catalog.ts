import { SERVICE_CATALOG } from "@/lib/discovery/catalog";
import { KEYWORD_CATALOG_SEEDS } from "@/lib/keywords/types";
import type { CollectedDocument, SearchAdapter } from "@/lib/research/types";

/**
 * Curated internal knowledge — NOT marketplace ranking/volume data.
 * Explicitly labeled curated_knowledge so it is never confused with observed listings.
 */
export const catalogAdapter: SearchAdapter = {
  id: "curated_catalog",
  async search(query) {
    const q = query.toLowerCase();
    const docs: CollectedDocument[] = [];

    for (const entry of SERVICE_CATALOG) {
      const score = entry.keywords.some(
        (k) => q.includes(k) || k.includes(q) || q.split(/\s+/).some((w) => k.includes(w) && w.length > 3)
      );
      const soft =
        score ||
        entry.mainService.toLowerCase().includes(q) ||
        entry.keywords.some((k) =>
          k.split(/\s+/).some((part) => part.length > 3 && q.includes(part))
        );

      if (!soft) continue;

      docs.push({
        adapter: "curated_catalog",
        title: `Catalog: ${entry.mainService}`,
        text: [
          `Main service: ${entry.mainService}`,
          `Category: ${entry.category}`,
          `Sub-services: ${entry.subServices.join("; ")}`,
          `Buyer types: ${entry.buyerTypes.join("; ")}`,
          `Use cases: ${entry.useCases.join("; ")}`,
        ].join("\n"),
        kind: "curated_knowledge",
        meta: { catalogId: entry.id },
      });

      const seeds = KEYWORD_CATALOG_SEEDS[entry.id];
      if (seeds) {
        docs.push({
          adapter: "curated_catalog",
          title: `Keyword seeds: ${entry.id}`,
          text: [
            seeds.core ? `Core: ${seeds.core}` : "",
            seeds.secondary?.length
              ? `Secondary: ${seeds.secondary.join("; ")}`
              : "",
            seeds.longTail?.length
              ? `Long-tail: ${seeds.longTail.join("; ")}`
              : "",
            seeds.buyerIntent?.length
              ? `Buyer-intent: ${seeds.buyerIntent.join("; ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          kind: "curated_knowledge",
          meta: { catalogId: entry.id, type: "keyword_seeds" },
        });
      }
    }

    // Platform expansion: bare "roblox" should still pull character-design catalog
    if (/\broblox\b/i.test(q) && docs.length === 0) {
      const roblox = SERVICE_CATALOG.find((e) => e.id === "roblox-character-design");
      if (roblox) {
        docs.push({
          adapter: "curated_catalog",
          title: `Platform expansion: Roblox → ${roblox.mainService}`,
          text: [
            "Bare platform query expanded to known freelance service branch (curated knowledge, not search-volume data).",
            `Sub-services: ${roblox.subServices.join("; ")}`,
            `Buyer types: ${roblox.buyerTypes.join("; ")}`,
            `Use cases: ${roblox.useCases.join("; ")}`,
          ].join("\n"),
          kind: "curated_knowledge",
          meta: { catalogId: roblox.id, expansion: true },
        });
      }
    }

    return docs;
  },
};
