import type { CollectedDocument, ResearchContext } from "@/lib/research/types";

/**
 * Marketplace research adapter contract.
 * Each marketplace (Fiverr now; Upwork/Contra/etc later) implements this.
 * Adapters only collect publicly observable / permitted evidence.
 */
export type MarketplaceId = "fiverr" | "upwork" | "contra" | "freelancer";

export type MarketplaceResearchAdapter = {
  id: MarketplaceId;
  /** Display label matching profiles.marketplaces values */
  label: string;
  /**
   * Collect marketplace-related evidence for a query.
   * Must not invent volumes, rankings, or private marketplace data.
   */
  research(
    query: string,
    context: ResearchContext
  ): Promise<CollectedDocument[]>;
};

export function normalizeMarketplaceLabel(value: string): MarketplaceId | null {
  const key = value.trim().toLowerCase();
  if (key === "fiverr") return "fiverr";
  if (key === "upwork") return "upwork";
  if (key === "contra") return "contra";
  if (key === "freelancer") return "freelancer";
  return null;
}
