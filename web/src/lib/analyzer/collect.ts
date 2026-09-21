import type { GigSnapshot } from "@/lib/analyzer/types";

/**
 * Build a gig snapshot from manually pasted public fields.
 * Fiverr URL fetch is skipped — automated access is often blocked.
 */
export async function collectGigFromPaste(input: {
  title: string;
  description: string;
  tags: string[];
}): Promise<GigSnapshot> {
  const title = input.title.trim();
  const description = input.description.trim();
  const tags = input.tags.map((t) => t.trim()).filter(Boolean);

  if (!title) throw new Error("Gig title is required.");
  if (!description) throw new Error("Gig description is required.");
  if (tags.length === 0) {
    throw new Error("At least one current tag is required.");
  }

  return {
    sourceUrl: "manual://pasted-gig",
    retrievedAt: new Date().toISOString(),
    retrievalStatus: "manual_paste",
    retrievalNotes: [
      "Gig fields were pasted by you (title, description, tags).",
      "Fiverr URL fetch is skipped because automated access is often blocked.",
    ],
    title,
    description,
    tags,
    category: null,
    subcategory: null,
    packages: [],
    pricingText: null,
    deliveryTime: null,
    revisionsText: null,
    faqs: [],
    requirements: [],
    sellerName: null,
    sellerLevel: null,
    reviewsCount: null,
    rating: null,
    reviewLanguage: [],
    rawExcerpt: description.slice(0, 500),
    listingId: null,
  };
}

export function snapshotToResearchSeed(snapshot: GigSnapshot): string {
  const parts = [
    snapshot.title,
    snapshot.category,
    ...(snapshot.tags ?? []),
    snapshot.description?.slice(0, 280),
  ].filter(Boolean);
  return parts.join(" ").trim() || "Fiverr gig service";
}
