import type { CollectedDocument, SearchAdapter } from "@/lib/research/types";

/**
 * DuckDuckGo Instant Answer API — public related topics (no secret key).
 * Does not provide Fiverr search volume or ranking.
 */
export const duckDuckGoAdapter: SearchAdapter = {
  id: "duckduckgo",
  async search(query) {
    const docs: CollectedDocument[] = [];
    const queries = [
      query,
      `${query} freelance service`,
      `${query} commission custom`,
      `${query} for YouTube`,
      `${query} UGC`,
    ];

    for (const q of queries.slice(0, 4)) {
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
            | { Name?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }
          >;
        };

        if (data.AbstractText) {
          docs.push({
            adapter: "duckduckgo",
            title: data.Heading || `DDG abstract: ${q}`,
            url: data.AbstractURL,
            text: data.AbstractText.slice(0, 1000),
            kind: "observed",
            meta: { query: q },
          });
        }

        const topics = data.RelatedTopics ?? [];
        for (const topic of topics.slice(0, 8)) {
          if ("Text" in topic && topic.Text) {
            docs.push({
              adapter: "duckduckgo",
              title: `Related: ${q}`,
              url: topic.FirstURL,
              text: topic.Text.slice(0, 400),
              kind: "observed",
              meta: { query: q },
            });
          } else if ("Topics" in topic && topic.Topics) {
            for (const nested of topic.Topics.slice(0, 4)) {
              if (nested.Text) {
                docs.push({
                  adapter: "duckduckgo",
                  title: `Related group: ${topic.Name || q}`,
                  url: nested.FirstURL,
                  text: nested.Text.slice(0, 400),
                  kind: "observed",
                  meta: { query: q },
                });
              }
            }
          }
        }
      } catch {
        // continue other queries
      }
    }

    return docs;
  },
};
