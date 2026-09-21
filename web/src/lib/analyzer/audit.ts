import { analyzeGigHealth } from "@/lib/gig/health";
import { suggestBoostTags } from "@/lib/analyzer/suggest-tags";
import type {
  GigAuditReport,
  GigSnapshot,
  TagAuditItem,
} from "@/lib/analyzer/types";

function snapshotText(snapshot: GigSnapshot): string {
  return [
    `Title: ${snapshot.title || "(unavailable)"}`,
    `Tags: ${snapshot.tags.join(", ") || "(unavailable)"}`,
    `Description: ${(snapshot.description || "(unavailable)").slice(0, 2500)}`,
  ].join("\n");
}

function ruleTagAnalysis(tags: string[], title: string | null): TagAuditItem[] {
  return tags.map((tag) => {
    const inTitle = title?.toLowerCase().includes(tag.toLowerCase());
    const words = tag.trim().split(/\s+/).length;
    return {
      tag,
      meaning: `Current gig tag “${tag}”.`,
      relationToService: inTitle
        ? "Also appears related to the title wording."
        : "Present as a tag under this service.",
      buyerIntent:
        words > 1
          ? "Possibly more specific buyer phrasing"
          : "Possibly broader category intent",
      breadth: words <= 1 ? "broad" : words >= 3 ? "specific" : "unclear",
      relatedTerms: [],
    };
  });
}

function ruleBasedAudit(snapshot: GigSnapshot): GigAuditReport {
  const health = analyzeGigHealth({
    title: snapshot.title ?? undefined,
    description: snapshot.description ?? undefined,
    tags: snapshot.tags,
    packagesText: JSON.stringify(snapshot.packages),
    faqText: JSON.stringify(snapshot.faqs),
  });

  const strengths = health
    .filter((h) => h.status === "pass")
    .map((h) => `${h.section}: ${h.finding}`);
  const weaknesses = health
    .filter((h) => h.status !== "pass")
    .map((h) => `${h.section}: ${h.finding} → ${h.fix}`);

  return {
    overview:
      snapshot.title ||
      "Gig overview limited — title/description not provided.",
    targetBuyer:
      "Not clearly evidenced from pasted fields alone — use boost tags + rephrase.",
    mainProblem:
      "Buyer problem inferred from title/description — refine with suggested tags.",
    desiredOutcome:
      "Desired outcome should be clearer in title/description after rephrase.",
    serviceStructure: "Based on pasted title, description, and current tags.",
    titleAnalysis: health
      .filter((h) => h.section === "title")
      .map((h) => `${h.check}: ${h.finding}`)
      .join(" "),
    tagAnalysis: ruleTagAnalysis(snapshot.tags, snapshot.title),
    suggestedBoostTags: [],
    descriptionAnalysis: health
      .filter((h) => h.section === "description")
      .map((h) => `${h.check}: ${h.finding}`)
      .join(" "),
    packageAnalysis: "Packages not pasted — focus on tags and copy first.",
    faqAnalysis: "FAQs not pasted.",
    requirementsAnalysis: "Buyer requirements not pasted.",
    strengths,
    weaknesses,
    missingInformation: [
      snapshot.tags.length < 5
        ? "Fewer than 5 tags — room to add boost tags"
        : "",
    ].filter(Boolean),
    potentialOpportunities: [
      "Add short tool + problem tags under this service.",
      "Rephrase title/description around the strongest boost tags.",
    ],
    areasForDeeperResearch: [
      "Buyer problems tied to tools in the title/tags",
    ],
    dimensions: [
      {
        id: "tag_boost_potential",
        label: "Tag boost potential",
        assessment:
          "Suggested tags aim at tools, short problems, and buyer needs under this service",
        evidence: snapshot.tags.join(", "),
      },
      {
        id: "title_relevance",
        label: "Title relevance",
        assessment: snapshot.title ? "Title provided" : "Title missing",
        evidence: snapshot.title || "unavailable",
      },
      {
        id: "description_completeness",
        label: "Description completeness",
        assessment: snapshot.description
          ? `~${snapshot.description.length} characters`
          : "Description missing",
        evidence: snapshot.description?.slice(0, 180) || "unavailable",
      },
    ],
    confidenceNotes: [
      "Suggestions are for Fiverr-style tags under this service — not a ranking score.",
      "No private Fiverr algorithm or search-volume claims.",
    ],
    provider: "rule_based",
  };
}

async function geminiAudit(
  snapshot: GigSnapshot
): Promise<GigAuditReport | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const modelList = [
    model,
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const prompt = `Audit this Fiverr gig from pasted fields.
Main goal later is suggesting boost tags — keep analysis short and practical.
Do NOT invent Fiverr ranking scores.

GIG:
${snapshotText(snapshot)}

Return ONLY JSON:
{
  "overview":"string",
  "targetBuyer":"string",
  "mainProblem":"string",
  "desiredOutcome":"string",
  "serviceStructure":"string",
  "titleAnalysis":"string",
  "tagAnalysis":[{"tag":"string","meaning":"string","relationToService":"string","buyerIntent":"string","breadth":"broad|specific|unclear","relatedTerms":["string"]}],
  "descriptionAnalysis":"string",
  "packageAnalysis":"string",
  "faqAnalysis":"string",
  "requirementsAnalysis":"string",
  "strengths":["string"],
  "weaknesses":["string"],
  "missingInformation":["string"],
  "potentialOpportunities":["string"],
  "areasForDeeperResearch":["string"],
  "dimensions":[{"id":"string","label":"string","assessment":"string","evidence":"string"}],
  "confidenceNotes":["string"]
}`;

  for (const m of modelList) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          m
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
              temperature: 0.2,
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
      const parsed = JSON.parse(match?.[0] ?? text) as GigAuditReport;
      return { ...parsed, suggestedBoostTags: [], provider: "gemini" };
    } catch {
      continue;
    }
  }
  return null;
}

export async function auditGigSnapshot(
  snapshot: GigSnapshot
): Promise<GigAuditReport> {
  const fallback = ruleBasedAudit(snapshot);
  const boost = await suggestBoostTags(snapshot);
  const ai = await geminiAudit(snapshot);
  const base = ai ?? fallback;

  if (
    (!base.tagAnalysis || base.tagAnalysis.length === 0) &&
    snapshot.tags.length
  ) {
    base.tagAnalysis = ruleTagAnalysis(snapshot.tags, snapshot.title);
  }

  base.suggestedBoostTags = boost.tags.slice(0, 10);
  base.provider = `${base.provider}+tags:${boost.provider}`;
  base.potentialOpportunities = [
    ...(base.potentialOpportunities ?? []),
    ...boost.tags.slice(0, 5).map((t) => `Add tag: ${t.tag} (${t.kind})`),
  ];

  return base;
}
