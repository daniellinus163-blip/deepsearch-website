import { catalogAdapter } from "@/lib/research/adapters/catalog";
import { duckDuckGoAdapter } from "@/lib/research/adapters/duckduckgo";
import { listingsAdapter } from "@/lib/research/adapters/listings";
import { wikipediaAdapter } from "@/lib/research/adapters/wikipedia";
import { marketplaceAdaptersAsSearchAdapters } from "@/lib/research/marketplaces/registry";
import type {
  CollectedDocument,
  ResearchContext,
  SearchAdapter,
} from "@/lib/research/types";

const BASE_ADAPTERS: SearchAdapter[] = [
  catalogAdapter,
  listingsAdapter,
  wikipediaAdapter,
  duckDuckGoAdapter,
];

function buildAdapterList(context: ResearchContext): SearchAdapter[] {
  const marketplaceAdapters = marketplaceAdaptersAsSearchAdapters(
    context.marketplaces
  );
  // Marketplace adapters first when selected so Fiverr evidence is prioritized
  return [...marketplaceAdapters, ...BASE_ADAPTERS];
}

export async function collectResearchDocuments(
  query: string,
  context: ResearchContext,
  adapters?: SearchAdapter[]
): Promise<{ docs: CollectedDocument[]; adaptersUsed: string[] }> {
  const resolved = adapters ?? buildAdapterList(context);
  const adaptersUsed: string[] = [];
  const docs: CollectedDocument[] = [];

  for (const adapter of resolved) {
    try {
      const batch = await adapter.search(query, context);
      if (batch.length) {
        adaptersUsed.push(adapter.id);
        docs.push(...batch);
      } else {
        adaptersUsed.push(`${adapter.id}:empty`);
      }
    } catch {
      adaptersUsed.push(`${adapter.id}:error`);
    }
  }

  // Follow-up pass: also hit marketplace adapters when Fiverr (etc.) is active
  const depth = context.researchDepth ?? "standard";
  const followLimit = depth === "quick" ? 2 : depth === "deep" ? 6 : 4;
  const followUps = (context.followUpTerms ?? []).slice(0, followLimit);
  const followAdapters: SearchAdapter[] = [
    ...marketplaceAdaptersAsSearchAdapters(context.marketplaces),
    duckDuckGoAdapter,
    wikipediaAdapter,
  ];

  for (const term of followUps) {
    for (const adapter of followAdapters) {
      try {
        const batch = await adapter.search(term, context);
        docs.push(
          ...batch.map((d) => ({
            ...d,
            meta: { ...d.meta, followUpOf: term },
          }))
        );
      } catch {
        // ignore
      }
    }
  }

  return { docs, adaptersUsed: [...new Set(adaptersUsed)] };
}
