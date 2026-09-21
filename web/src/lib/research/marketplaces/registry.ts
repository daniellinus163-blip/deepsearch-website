import { fiverrResearchAdapter } from "@/lib/research/marketplaces/fiverr";
import {
  normalizeMarketplaceLabel,
  type MarketplaceId,
  type MarketplaceResearchAdapter,
} from "@/lib/research/marketplaces/types";
import type { CollectedDocument, ResearchContext } from "@/lib/research/types";

const REGISTRY: MarketplaceResearchAdapter[] = [
  fiverrResearchAdapter,
  // Future: upworkResearchAdapter, contraResearchAdapter, freelancerResearchAdapter
];

export function listMarketplaceAdapters(): MarketplaceResearchAdapter[] {
  return [...REGISTRY];
}

export function getMarketplaceAdapter(
  id: MarketplaceId
): MarketplaceResearchAdapter | null {
  return REGISTRY.find((a) => a.id === id) ?? null;
}

/**
 * Resolve which marketplace adapters to run from profile.marketplaces values.
 * Unknown / unimplemented marketplaces are skipped (architecture ready).
 */
export function resolveMarketplaceAdapters(
  selectedLabels: string[] | null | undefined
): MarketplaceResearchAdapter[] {
  const ids = new Set<MarketplaceId>();
  for (const label of selectedLabels ?? []) {
    const id = normalizeMarketplaceLabel(label);
    if (id) ids.add(id);
  }
  return REGISTRY.filter((a) => ids.has(a.id));
}

/**
 * SearchAdapter-compatible wrapper so marketplace adapters plug into the collector.
 */
export function marketplaceAdaptersAsSearchAdapters(
  selectedLabels: string[] | null | undefined
) {
  const adapters = resolveMarketplaceAdapters(selectedLabels);
  return adapters.map((m) => ({
    id: `marketplace:${m.id}`,
    async search(query: string, context?: ResearchContext) {
      return m.research(query, context ?? { normalizedQuery: query });
    },
  }));
}

export async function collectMarketplaceEvidence(
  query: string,
  context: ResearchContext,
  selectedLabels: string[] | null | undefined
): Promise<{ docs: CollectedDocument[]; adaptersUsed: string[] }> {
  const adapters = resolveMarketplaceAdapters(selectedLabels);
  const docs: CollectedDocument[] = [];
  const adaptersUsed: string[] = [];

  for (const adapter of adapters) {
    try {
      const batch = await adapter.research(query, context);
      if (batch.length) {
        adaptersUsed.push(`marketplace:${adapter.id}`);
        docs.push(...batch);
      } else {
        adaptersUsed.push(`marketplace:${adapter.id}:empty`);
      }
    } catch {
      adaptersUsed.push(`marketplace:${adapter.id}:error`);
    }
  }

  return { docs, adaptersUsed };
}
