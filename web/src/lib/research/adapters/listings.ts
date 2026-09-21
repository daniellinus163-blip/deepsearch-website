import { createClient } from "@/lib/supabase/server";
import type { CollectedDocument, SearchAdapter } from "@/lib/research/types";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Observed marketplace listings previously captured by the extension.
 * Public/observable fields only — never treated as Fiverr private ranking data.
 */
export const listingsAdapter: SearchAdapter = {
  id: "saved_marketplace_listings",
  async search(query, context) {
    if (!isSupabaseConfigured() || !context?.userId) return [];

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select(
          "title, category, tags, description, price_text, delivery_time, seller_name, faq, packages, source_url, marketplace"
        )
        .eq("user_id", context.userId)
        .order("extracted_at", { ascending: false })
        .limit(40);

      if (error || !data?.length) return [];

      const q = query.toLowerCase();
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

        if (q.length >= 3 && !blob.includes(q.split(/\s+/)[0] ?? q)) {
          // Keep loosely related if any token overlaps
          const tokens = q.split(/\s+/).filter((t) => t.length > 3);
          if (!tokens.some((t) => blob.includes(t))) continue;
        }

        docs.push({
          adapter: "saved_marketplace_listings",
          title: row.title || "Untitled listing",
          url: row.source_url ?? undefined,
          text: [
            `Marketplace: ${row.marketplace}`,
            row.category ? `Category: ${row.category}` : "",
            row.tags?.length ? `Tags: ${row.tags.join(", ")}` : "",
            row.price_text ? `Price (visible): ${row.price_text}` : "",
            row.delivery_time ? `Delivery (visible): ${row.delivery_time}` : "",
            row.description
              ? `Description excerpt: ${String(row.description).slice(0, 500)}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          kind: "observed",
          meta: {
            note: "Observable public page fields only — not private ranking/search APIs.",
          },
        });
      }

      return docs;
    } catch {
      return [];
    }
  },
};
