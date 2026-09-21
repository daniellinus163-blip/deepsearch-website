import { dedupeFindingsByLabel, isGenericNoise } from "@/lib/research/filters";
import type {
  CollectedDocument,
  ConfidenceLevel,
  EvidenceKind,
  Finding,
  ResearchEvidence,
} from "@/lib/research/types";

function titleCase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) =>
      w.toUpperCase() === w && w.length <= 4
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

function pushFinding(
  bucket: Finding[],
  label: string,
  why: string,
  evidenceIds: string[],
  confidence: ConfidenceLevel,
  kind: EvidenceKind
) {
  if (isGenericNoise(label)) return;
  bucket.push({ label: titleCase(label), why, evidenceIds, confidence, kind });
}

const FEATURE_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /dynamic\s+head/i, label: "Dynamic Head" },
  { re: /\bfurry\b/i, label: "Furry / anthro style" },
  { re: /\bugc\b/i, label: "UGC" },
  { re: /\bvtuber\b/i, label: "VTuber-ready" },
  { re: /3d\s*model/i, label: "3D model" },
  { re: /\bavatar\b/i, label: "Avatar" },
  { re: /\bcommission\b/i, label: "Commission workflow" },
  { re: /\brigging\b/i, label: "Rigging" },
  { re: /\bclothing\b/i, label: "Clothing / outfits" },
  { re: /accessor(y|ies)/i, label: "Accessories" },
];

const AUDIENCE_HINTS = [
  { re: /youtube/i, label: "YouTube creators" },
  { re: /vtuber|streamer|twitch/i, label: "Streamers / VTubers" },
  { re: /game\s*dev|developer|studio/i, label: "Game developers" },
  { re: /ugc\s*creat/i, label: "UGC creators" },
  { re: /content\s*creat/i, label: "Content creators" },
];

const PROBLEM_HINTS = [
  { re: /generic|template|default\s+avatar/i, label: "Avoiding generic default avatars" },
  { re: /stand\s+out|unique|identity/i, label: "Needs a recognizable identity" },
  { re: /brand|channel/i, label: "Channel/brand consistency gaps" },
];

export function documentsToEvidence(
  docs: CollectedDocument[]
): ResearchEvidence[] {
  return docs.map((doc, index) => ({
    id: `ev_${index + 1}`,
    source: doc.adapter,
    kind: doc.kind,
    confidence:
      doc.kind === "observed"
        ? "strong"
        : doc.kind === "curated_knowledge"
          ? "moderate"
          : "weak",
    snippet: `${doc.title}: ${doc.text}`.slice(0, 400),
    url: doc.url,
    collectedAt: new Date().toISOString(),
  }));
}

export function extractPatterns(
  query: string,
  docs: CollectedDocument[],
  evidence: ResearchEvidence[]
) {
  const serviceBranches: Finding[] = [];
  const buyerTypes: Finding[] = [];
  const useCases: Finding[] = [];
  const buyerProblems: Finding[] = [];
  const features: Finding[] = [];
  const broad: Finding[] = [];
  const specific: Finding[] = [];
  const longTail: Finding[] = [];
  const buyerIntent: Finding[] = [];
  const competitorObservations: Finding[] = [];

  const evidenceByAdapter = new Map<string, string[]>();
  evidence.forEach((e) => {
    const list = evidenceByAdapter.get(e.source) ?? [];
    list.push(e.id);
    evidenceByAdapter.set(e.source, list);
  });

  const allText = docs.map((d) => d.text).join("\n");

  // Catalog structured lines
  for (const doc of docs) {
    const ids = evidence
      .filter((e) => e.snippet.startsWith(doc.title))
      .map((e) => e.id);

    const subMatch = doc.text.match(/Sub-services:\s*(.+)/i);
    if (subMatch?.[1]) {
      subMatch[1].split(/;|,/).forEach((part) => {
        pushFinding(
          serviceBranches,
          part.trim(),
          "Listed as a service branch in curated/platform research knowledge.",
          ids.slice(0, 2),
          doc.kind === "curated_knowledge" ? "moderate" : "weak",
          doc.kind
        );
      });
    }

    const buyerMatch = doc.text.match(/Buyer types:\s*(.+)/i);
    if (buyerMatch?.[1]) {
      buyerMatch[1].split(/;|,/).forEach((part) => {
        pushFinding(
          buyerTypes,
          part.trim(),
          "Associated buyer type from curated research knowledge.",
          ids.slice(0, 2),
          "moderate",
          "curated_knowledge"
        );
      });
    }

    const useMatch = doc.text.match(/Use cases:\s*(.+)/i);
    if (useMatch?.[1]) {
      useMatch[1].split(/;|,/).forEach((part) => {
        pushFinding(
          useCases,
          part.trim(),
          "Associated use case from curated research knowledge.",
          ids.slice(0, 2),
          "moderate",
          "curated_knowledge"
        );
      });
    }

    // Listing observations
    if (
      doc.adapter === "saved_marketplace_listings" ||
      doc.adapter.startsWith("marketplace:")
    ) {
      const tagMatch = doc.text.match(/Tags:\s*(.+)/i);
      if (tagMatch?.[1]) {
        tagMatch[1].split(/,/).forEach((tag) => {
          pushFinding(
            specific,
            tag.trim(),
            "Observed in a saved marketplace listing tag (public page field).",
            ids.slice(0, 1),
            "strong",
            "observed"
          );
        });
      }
      pushFinding(
        competitorObservations,
        doc.title,
        "Observable competitor/listing title captured from a public marketplace page.",
        ids.slice(0, 1),
        "strong",
        "observed"
      );
    }

    // DDG / wiki free text — extract "for X" style long-tails when query appears
    const forMatches = doc.text.matchAll(
      new RegExp(
        `${query.split(/\s+/)[0]}[^.]{0,40}\\bfor\\b\\s+([A-Za-z0-9][\\w\\s-]{2,40})`,
        "gi"
      )
    );
    for (const m of forMatches) {
      const combo = `${titleCase(query)} for ${titleCase(m[1])}`;
      pushFinding(
        longTail,
        combo,
        "Combination pattern observed in public web text (service + audience/use).",
        ids.slice(0, 1),
        "weak",
        "inferred"
      );
      pushFinding(
        buyerIntent,
        combo,
        "Buyer-intent style phrasing inferred from public text combining service + audience.",
        ids.slice(0, 1),
        "weak",
        "inferred"
      );
    }
  }

  for (const hint of FEATURE_HINTS) {
    if (hint.re.test(allText)) {
      pushFinding(
        features,
        hint.label,
        "Feature language appears across collected sources.",
        evidence.slice(0, 3).map((e) => e.id),
        "moderate",
        "inferred"
      );
    }
  }

  for (const audience of AUDIENCE_HINTS) {
    if (audience.re.test(allText)) {
      pushFinding(
        buyerTypes,
        audience.label,
        "Audience language appears in collected public/curated sources.",
        evidence.slice(0, 3).map((e) => e.id),
        "moderate",
        "inferred"
      );
      pushFinding(
        useCases,
        `${audience.label} content / presence`,
        "Inferred use case from audience language in sources.",
        evidence.slice(0, 2).map((e) => e.id),
        "weak",
        "inferred"
      );
    }
  }

  for (const problem of PROBLEM_HINTS) {
    if (problem.re.test(allText)) {
      pushFinding(
        buyerProblems,
        problem.label,
        "Problem language appears in collected sources.",
        evidence.slice(0, 2).map((e) => e.id),
        "weak",
        "inferred"
      );
    }
  }

  pushFinding(
    broad,
    query,
    "Core query as entered by the user (starting point, not a niche discovery).",
    evidence.slice(0, 1).map((e) => e.id),
    "strong",
    "observed"
  );

  // Known Roblox non-obvious branches if evidence mentions them
  const robloxNonObvious = [
    "Dynamic Head",
    "Furry Avatar",
    "UGC Character",
    "YouTube Character",
    "VTuber Character",
  ];
  if (/\broblox\b/i.test(query) || /\broblox\b/i.test(allText)) {
    for (const item of robloxNonObvious) {
      if (new RegExp(item, "i").test(allText)) {
        pushFinding(
          serviceBranches,
          item,
          "Non-generic Roblox service branch supported by curated/public evidence.",
          evidence.slice(0, 2).map((e) => e.id),
          "moderate",
          "curated_knowledge"
        );
      }
    }
  }

  return {
    serviceBranches: dedupeFindingsByLabel(serviceBranches),
    buyerTypes: dedupeFindingsByLabel(buyerTypes),
    useCases: dedupeFindingsByLabel(useCases),
    buyerProblems: dedupeFindingsByLabel(buyerProblems),
    features: dedupeFindingsByLabel(features),
    relatedTerms: {
      broad: dedupeFindingsByLabel(broad),
      specific: dedupeFindingsByLabel(specific),
      longTail: dedupeFindingsByLabel(longTail),
      buyerIntent: dedupeFindingsByLabel(buyerIntent),
    },
    competitorObservations: dedupeFindingsByLabel(competitorObservations).slice(
      0,
      12
    ),
  };
}
