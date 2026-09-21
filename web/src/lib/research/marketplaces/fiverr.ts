import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { CollectedDocument, ResearchContext } from "@/lib/research/types";
import type { MarketplaceResearchAdapter } from "@/lib/research/marketplaces/types";

/**
 * Fiverr marketplace research adapter.
 *
 * Evidence sources (public / permitted only):
 * 1. User-saved Fiverr listings captured by the extension (observable page fields)
 * 2. Public DuckDuckGo results restricted to site:fiverr.com (indexed public pages)
 *
 * Does NOT access Fiverr private APIs, search volume, rankings, or buyer databases.
 */
export const fiverrResearchAdapter: MarketplaceResearchAdapter = {
  id: "fiverr",
  label: "Fiverr",

  async research(query, context) {
    const docs: CollectedDocument[] = [];
    const q = query.trim();
    if (!q) return docs;

    docs.push(...(await loadSavedFiverrListings(q, context)));
    docs.push(...(await searchPublicFiverrIndexedPages(q, context)));

    return docs;
  },
};

async function loadSavedFiverrListings(
  query: string,
  context: ResearchContext
): Promise<CollectedDocument[]> {
  if (!isSupabaseConfigured() || !context.userId) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(
        "title, category, tags, description, price_text, delivery_time, seller_name, seller_level, reviews_count, rating, faq, packages, source_url, marketplace, page_type"
      )
      .eq("user_id", context.userId)
      .ilike("marketplace", "fiverr")
      .order("extracted_at", { ascending: false })
      .limit(50);

    if (error || !data?.length) return [];

    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const docs: CollectedDocument[] = [];

    for (const row of data) {
      const blob = [
        row.title,
        row.category,
        ...(row.tags ?? []),
        row.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        tokens.length &&
        !tokens.some((t) => blob.includes(t)) &&
        !blob.includes(query.toLowerCase().split(/\s+/)[0] ?? "")
      ) {
        continue;
      }

      const faqText = Array.isArray(row.faq)
        ? row.faq
            .slice(0, 4)
            .map((f: unknown) => {
              if (!f || typeof f !== "object") return "";
              const item = f as { question?: string; answer?: string };
              return [item.question, item.answer].filter(Boolean).join(" — ");
            })
            .filter(Boolean)
            .join("; ")
        : "";

      const packageText = Array.isArray(row.packages)
        ? row.packages
            .slice(0, 3)
            .map((p: unknown) => {
              if (!p || typeof p !== "object") return "";
              const pkg = p as { name?: string; description?: string };
              return [pkg.name, pkg.description].filter(Boolean).join(": ");
            })
            .filter(Boolean)
            .join(" | ")
        : "";

      docs.push({
        adapter: "marketplace:fiverr",
        title: row.title || "Fiverr listing (saved)",
        url: row.source_url ?? undefined,
        text: [
          "Source: saved Fiverr listing (public page fields captured by extension).",
          `Page type: ${row.page_type}`,
          row.category ? `Category: ${row.category}` : "",
          row.tags?.length ? `Tags: ${row.tags.join(", ")}` : "",
          row.price_text ? `Visible price: ${row.price_text}` : "",
          row.delivery_time ? `Visible delivery: ${row.delivery_time}` : "",
          row.seller_name
            ? `Seller: ${row.seller_name}${row.seller_level ? ` (${row.seller_level})` : ""}`
            : "",
          row.reviews_count != null
            ? `Visible reviews count: ${row.reviews_count}`
            : "",
          row.rating != null ? `Visible rating: ${row.rating}` : "",
          row.description
            ? `Description excerpt: ${String(row.description).slice(0, 600)}`
            : "",
          packageText ? `Visible packages: ${packageText}` : "",
          faqText ? `Visible FAQs: ${faqText}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        kind: "observed",
        meta: {
          marketplace: "fiverr",
          note: "Observable public page fields only — not private ranking/search APIs.",
        },
      });
    }

    return docs;
  } catch {
    return [];
  }
}

/**
 * Public web index of Fiverr pages via DuckDuckGo site: filter.
 * Returns abstracts/related topics only — not private Fiverr data.
 */
async function searchPublicFiverrIndexedPages(
  query: string,
  context?: ResearchContext
): Promise<CollectedDocument[]> {
  const docs: CollectedDocument[] = [];
  const searches = [
    `site:fiverr.com ${query}`,
    `site:fiverr.com ${query} fix`,
    `site:fiverr.com ${query} integration`,
    `site:fiverr.com ${query} setup`,
    `site:fiverr.com ${query} error`,
  ];

  const depth = context?.researchDepth ?? "standard";
  const limit = depth === "quick" ? 2 : depth === "deep" ? 5 : 3;

  for (const q of searches.slice(0, limit)) {
    try {
      const url = new URL("https://api.duckduckgo.com/");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("no_redirect", "1");
      url.searchParams.set("no_html", "1");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        AbstractText?: string;
        AbstractURL?: string;
        Heading?: string;
        RelatedTopics?: Array<
          | { Text?: string; FirstURL?: string }
          | {
              Name?: string;
              Topics?: Array<{ Text?: string; FirstURL?: string }>;
            }
        >;
      };

      if (data.AbstractText) {
        docs.push({
          adapter: "marketplace:fiverr",
          title: data.Heading || `Public Fiverr index: ${query}`,
          url: data.AbstractURL,
          text: `Public web index (DuckDuckGo site:fiverr.com). Not private Fiverr analytics.\n${data.AbstractText.slice(0, 800)}`,
          kind: "observed",
          meta: { marketplace: "fiverr", query: q, via: "duckduckgo_site" },
        });
      }

      for (const topic of data.RelatedTopics ?? []) {
        if ("Text" in topic && topic.Text) {
          const isFiverr =
            /fiverr\.com/i.test(topic.FirstURL || "") ||
            /fiverr/i.test(topic.Text);
          if (!isFiverr && !/fiverr/i.test(q)) continue;
          docs.push({
            adapter: "marketplace:fiverr",
            title: `Fiverr-related public result: ${query}`,
            url: topic.FirstURL,
            text: topic.Text.slice(0, 400),
            kind: "observed",
            meta: { marketplace: "fiverr", query: q, via: "duckduckgo_site" },
          });
        } else if ("Topics" in topic && topic.Topics) {
          for (const nested of topic.Topics.slice(0, 4)) {
            if (!nested.Text) continue;
            if (
              nested.FirstURL &&
              !/fiverr\.com/i.test(nested.FirstURL) &&
              !/fiverr/i.test(nested.Text)
            ) {
              continue;
            }
            docs.push({
              adapter: "marketplace:fiverr",
              title: `Fiverr topic group: ${topic.Name || query}`,
              url: nested.FirstURL,
              text: nested.Text.slice(0, 400),
              kind: "observed",
              meta: { marketplace: "fiverr", query: q, via: "duckduckgo_site" },
            });
          }
        }
      }
    } catch {
      // continue
    }
  }

  return docs;
}
