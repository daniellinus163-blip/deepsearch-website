import type { GigSnapshot } from "@/lib/analyzer/types";

export type BoostTagKind =
  | "tool"
  | "problem"
  | "buyer_need"
  | "style"
  | "service";

export type BoostTag = {
  tag: string;
  kind: BoostTagKind;
  why: string;
  alreadyOnGig: boolean;
};

function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

function isShortFiverrTag(tag: string): boolean {
  const t = tag.trim();
  if (t.length < 2 || t.length > 30) return false;
  const words = t.split(/\s+/).length;
  return words <= 4;
}

function existingSet(snapshot: GigSnapshot): Set<string> {
  return new Set(snapshot.tags.map((t) => normalizeTag(t)).filter(Boolean));
}

function ruleBasedBoostTags(snapshot: GigSnapshot): BoostTag[] {
  const existing = existingSet(snapshot);
  const blob = [
    snapshot.title,
    snapshot.description,
    ...snapshot.tags,
  ]
    .join(" ")
    .toLowerCase();

  const candidates: Array<{ tag: string; kind: BoostTagKind; why: string }> = [];

  // Extract likely tools from title/description (capitalized / common patterns)
  const toolHints =
    blob.match(
      /\b(stripe|paypal|shopify|wordpress|webflow|figma|react|next\.?js|node\.?js|python|django|laravel|woocommerce|squarespace|canva|after effects|premiere|photoshop|illustrator|blender|unity|unreal|aws|firebase|supabase|mongodb|mysql|postgres|docker|kubernetes|zapier|make\.com|n8n|hubspot|salesforce|notion|airtable|excel|google sheets|seo|chatgpt|openai|claude|midjourney|stable diffusion)\b/gi
    ) ?? [];

  for (const tool of [...new Set(toolHints.map((t) => t.toLowerCase()))]) {
    candidates.push({
      tag: tool,
      kind: "tool",
      why: "Tool/platform named in the gig — strong Fiverr search intent under this service.",
    });
  }

  const problemHints: Array<[RegExp, string, string]> = [
    [/\berror|bug|fix|broken|fail/i, "bug fix", "Short buyer problem keyword for repair work."],
    [/\bsetup|install|configure/i, "setup", "Buyer need: getting something working."],
    [/\bintegrat/i, "integration", "Buyer need: connect systems."],
    [/\bautomat/i, "automation", "Buyer need: reduce manual work."],
    [/\bmigrat/i, "migration", "Buyer need: move or upgrade."],
    [/\boptim|speed|performance/i, "optimization", "Buyer need: improve performance."],
    [/\bredesign|revamp/i, "redesign", "Buyer need: refresh existing work."],
    [/\blanding page/i, "landing page", "Use-case keyword buyers search on Fiverr."],
    [/\blogo/i, "logo design", "Style/service keyword under design gigs."],
    [/\bwebhook/i, "webhook", "Technical problem/tool term buyers search."],
    [/\bpayment/i, "payment gateway", "Buyer need tied to checkout problems."],
    [/\bapi\b/i, "api", "Tool/service keyword under development gigs."],
  ];

  for (const [re, tag, why] of problemHints) {
    if (re.test(blob)) {
      candidates.push({ tag, kind: "problem", why });
    }
  }

  // From existing tags, suggest sibling short problem/tool form
  for (const t of snapshot.tags) {
    const n = normalizeTag(t);
    if (!n) continue;
    if (n.includes(" ")) {
      const parts = n.split(" ");
      for (const p of parts) {
        if (p.length >= 3 && !existing.has(p)) {
          candidates.push({
            tag: p,
            kind: "service",
            why: "Shorter keyword derived from an existing tag — often stronger as a Fiverr tag slot.",
          });
        }
      }
    }
  }

  const out: BoostTag[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const tag = normalizeTag(c.tag);
    if (!tag || !isShortFiverrTag(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push({
      tag,
      kind: c.kind,
      why: c.why,
      alreadyOnGig: existing.has(tag),
    });
  }

  return out.filter((t) => !t.alreadyOnGig).slice(0, 10);
}

async function geminiBoostTags(snapshot: GigSnapshot): Promise<BoostTag[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const models = [
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const existing = snapshot.tags.join(", ");
  const prompt = `You help Fiverr sellers pick search tags that can boost discoverability.

GIG TITLE: ${snapshot.title}
GIG DESCRIPTION: ${(snapshot.description || "").slice(0, 2000)}
CURRENT TAGS: ${existing || "(none)"}

Return UP TO 10 NEW tags the seller can ADD. Rules:
- Must stay under THIS service (same niche as the gig)
- Prefer: tools/platforms used in the service, short problem keywords, buyer-need phrases
- Problem tags must be SHORT keywords (1–3 words), not sentences
- Must sound like real Fiverr search tags buyers type
- Do NOT invent fake search volume or ranking claims
- Do NOT repeat current tags
- Mix kinds: tool | problem | buyer_need | style | service
- Each tag max ~30 characters

Return ONLY JSON:
{
  "tags":[
    {"tag":"short tag","kind":"tool|problem|buyer_need|style|service","why":"one short reason"}
  ]
}`;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) {
        if ([429, 503, 404].includes(res.status)) continue;
        return null;
      }
      const raw = await res.text();
      const payload = JSON.parse(raw) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) continue;
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? text) as {
        tags?: Array<{ tag?: string; kind?: string; why?: string }>;
      };
      const existing = existingSet(snapshot);
      const kinds = new Set([
        "tool",
        "problem",
        "buyer_need",
        "style",
        "service",
      ]);
      const out: BoostTag[] = [];
      const seen = new Set<string>();
      for (const row of parsed.tags ?? []) {
        const tag = normalizeTag(String(row.tag ?? ""));
        if (!tag || !isShortFiverrTag(tag) || seen.has(tag) || existing.has(tag)) {
          continue;
        }
        const kind = kinds.has(String(row.kind))
          ? (row.kind as BoostTagKind)
          : "service";
        seen.add(tag);
        out.push({
          tag,
          kind,
          why: String(row.why || "Relevant under this Fiverr service.").slice(0, 160),
          alreadyOnGig: false,
        });
        if (out.length >= 10) break;
      }
      if (out.length) return out;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Suggest up to 10 Fiverr-style tags that can boost the gig under its service.
 */
export async function suggestBoostTags(
  snapshot: GigSnapshot
): Promise<{ tags: BoostTag[]; provider: string }> {
  const ai = await geminiBoostTags(snapshot);
  if (ai?.length) return { tags: ai.slice(0, 10), provider: "gemini" };

  const fallback = ruleBasedBoostTags(snapshot);
  return { tags: fallback, provider: "rule_based" };
}
