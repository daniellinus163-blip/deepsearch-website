import type { CollectedDocument, SearchAdapter } from "@/lib/research/types";

/**
 * Public Wikipedia OpenSearch — real HTTP evidence, not invented data.
 */
export const wikipediaAdapter: SearchAdapter = {
  id: "wikipedia",
  async search(query) {
    const docs: CollectedDocument[] = [];
    try {
      const url = new URL("https://en.wikipedia.org/w/api.php");
      url.searchParams.set("action", "opensearch");
      url.searchParams.set("search", query);
      url.searchParams.set("limit", "6");
      url.searchParams.set("namespace", "0");
      url.searchParams.set("format", "json");
      url.searchParams.set("origin", "*");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return docs;

      const data = (await res.json()) as [
        string,
        string[],
        string[],
        string[],
      ];
      const titles = data[1] ?? [];
      const descriptions = data[2] ?? [];
      const links = data[3] ?? [];

      titles.forEach((title, i) => {
        docs.push({
          adapter: "wikipedia",
          title,
          url: links[i],
          text: descriptions[i] || `Wikipedia topic: ${title}`,
          kind: "observed",
          meta: { source: "wikipedia_opensearch" },
        });
      });

      // Follow-up: fetch summary for top hit
      if (titles[0]) {
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          titles[0]
        )}`;
        const summaryRes = await fetch(summaryUrl, {
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        });
        if (summaryRes.ok) {
          const summary = (await summaryRes.json()) as {
            extract?: string;
            description?: string;
            content_urls?: { desktop?: { page?: string } };
          };
          if (summary.extract) {
            docs.push({
              adapter: "wikipedia",
              title: `Summary: ${titles[0]}`,
              url: summary.content_urls?.desktop?.page,
              text: summary.extract.slice(0, 1200),
              kind: "observed",
              meta: { source: "wikipedia_summary" },
            });
          }
        }
      }
    } catch {
      // Network failures → empty; orchestrator will note insufficient evidence
    }
    return docs;
  },
};
