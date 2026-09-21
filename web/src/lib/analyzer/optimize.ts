import type {
  GigAuditReport,
  GigSnapshot,
  OptimizedChange,
  OptimizedGigBundle,
} from "@/lib/analyzer/types";
import type { DeepResearchReport } from "@/lib/research/types";
import type { AnalyzerDeepResult } from "@/lib/analyzer/types";

function clampTitle(title: string, max = 80) {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function buildChanges(
  snapshot: GigSnapshot,
  optimized: OptimizedGigBundle
): OptimizedChange[] {
  const changes: OptimizedChange[] = [];
  if (snapshot.title && snapshot.title !== optimized.title) {
    changes.push({
      area: "Title",
      original: snapshot.title,
      changedTo: optimized.title,
      reason:
        "Refocused toward researched buyer problem / tool specificity rather than broad wording alone.",
      evidence: "Deep research micro-niche + audit title analysis",
    });
  }
  const oldTags = snapshot.tags.join(", ") || "(none retrieved)";
  const newTags = optimized.tags.join(", ");
  if (oldTags !== newTags) {
    changes.push({
      area: "Tags",
      original: oldTags,
      changedTo: newTags,
      reason:
        "Replaced/expanded with evidence-backed problem/tool/use-case clusters from deep research.",
      evidence: "Niche tag pool + tag clusters",
    });
  }
  if (snapshot.description && snapshot.description.slice(0, 120) !== optimized.description.slice(0, 120)) {
    changes.push({
      area: "Description",
      original: snapshot.description.slice(0, 180) + "…",
      changedTo: optimized.description.slice(0, 180) + "…",
      reason:
        "Rewrote around researched buyer problem, tool/platform, outcome, and clearer scope.",
      evidence: "Problem depth + buyer need research",
    });
  }
  return changes;
}

async function geminiOptimize(input: {
  snapshot: GigSnapshot;
  audit: GigAuditReport;
  deep: AnalyzerDeepResult;
  report: DeepResearchReport;
}): Promise<OptimizedGigBundle | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const preferred = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const models = [
    preferred,
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const niche = input.report.microNiches[0];
  const prompt = `Optimize a Fiverr gig using deep research findings. Do NOT merely paraphrase the original.
Do NOT invent private Fiverr ranking/search volume.
Title ~80 chars. Description ~1000 chars. Natural writing. No keyword stuffing.
Tags: 5 short marketplace-style tags (not full sentences).

ORIGINAL TITLE: ${input.snapshot.title || "(unavailable)"}
ORIGINAL TAGS: ${input.snapshot.tags.join(", ") || "(unavailable)"}
ORIGINAL DESC EXCERPT: ${(input.snapshot.description || "").slice(0, 800)}

AUDIT SUMMARY: ${input.audit.overview}
MAIN PROBLEM: ${input.audit.mainProblem}
TARGET BUYER: ${input.audit.targetBuyer}

DEEP RESEARCH QUERY: ${input.deep.researchQuery}
MICRO NICHE: ${niche?.title || input.report.coreService}
BUYER: ${niche?.buyer || ""}
PROBLEM: ${niche?.problem || ""}
TOOL: ${niche?.toolPlatform || ""}
SERVICE: ${niche?.service || ""}
OUTCOME: ${niche?.desiredOutcome || ""}
TAG CLUSTER: ${(niche?.tagCluster || input.report.nicheTagPool.slice(0, 6).map((t) => t.tag)).join(", ")}
MISSING: ${input.deep.missing
    .slice(0, 8)
    .map((m) => `${m.category}:${m.item}`)
    .join("; ")}
LIMITATION: ${input.report.fiverrLimitationNote}

Return ONLY JSON:
{
  "title":"string",
  "description":"string",
  "tags":["string"],
  "packages":[{"name":"Basic","summary":"string","includes":["string"]},{"name":"Standard","summary":"string","includes":["string"]},{"name":"Premium","summary":"string","includes":["string"]}],
  "faqs":[{"question":"string","answer":"string"}],
  "requirements":["string"]
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
      const parsed = JSON.parse(match?.[0] ?? text) as OptimizedGigBundle;
      const tags = (parsed.tags || [])
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0 && t.length <= 40)
        .slice(0, 5);
      return {
        ...parsed,
        title: clampTitle(
          parsed.title || niche?.title || input.report.coreService
        ),
        description: String(parsed.description || "").slice(0, 1200),
        tags:
          tags.length > 0
            ? tags
            : (niche?.tagCluster || []).slice(0, 5),
        packages: parsed.packages || [],
        faqs: parsed.faqs || [],
        requirements: parsed.requirements || [],
        changes: [],
        provider: `gemini:${model}`,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function ruleBasedOptimizedGig(input: {
  snapshot: GigSnapshot;
  deep: AnalyzerDeepResult;
  report: DeepResearchReport;
}): OptimizedGigBundle {
  const niche = input.report.microNiches[0];
  const cluster = input.deep.tagClusters[0];
  const problem =
    niche?.problem ||
    input.report.buyerProblems[0]?.label ||
    "a recurring technical issue";
  const tool = niche?.toolPlatform || input.report.discoveredTools[0]?.label || "";
  const service =
    niche?.service ||
    input.report.recommendedPositioning[0]?.label ||
    "implementation help";
  const outcome =
    niche?.desiredOutcome ||
    input.report.useCases[0]?.label ||
    "a working outcome";

  const titleCore = [tool, problem, service]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const title = clampTitle(
    titleCore
      ? `I will help with ${titleCore}`.slice(0, 80)
      : input.snapshot.title || "I will deliver a researched micro-niche service"
  );

  const tags = (
    cluster?.tags ||
    niche?.tagCluster ||
    input.report.nicheTagPool.map((t) => t.tag) ||
    input.snapshot.tags
  )
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0 && t.length <= 40)
    .slice(0, 5);

  const buyer =
    niche?.buyer || input.report.buyerTypes[0]?.label || "buyers in this niche";
  const description = [
    `Struggling with ${problem}?`,
    `This gig is for ${buyer} who need ${service}${tool ? ` involving ${tool}` : ""}.`,
    `I focus on getting you to: ${outcome}.`,
    `Based on research into related buyer problems, tool issues, and public marketplace patterns — not generic keyword stuffing.`,
    `Scope is limited to this specific problem/tool path so deliverables stay clear.`,
    `Message me with your current setup and the exact error or goal to get started.`,
  ].join("\n\n");

  const packages = [
    {
      name: "Basic",
      summary: `Diagnose ${problem}${tool ? ` in ${tool}` : ""}`,
      includes: [
        "Review of your current setup/logs",
        "Root-cause notes",
        "Clear next-step fix plan",
      ],
    },
    {
      name: "Standard",
      summary: `Implement the fix for ${problem}`,
      includes: [
        "Everything in Basic",
        "Hands-on fix / configuration",
        "Verification of the main happy path",
      ],
    },
    {
      name: "Premium",
      summary: `Full fix plus related edge cases`,
      includes: [
        "Everything in Standard",
        "Edge-case checks from researched buyer issues",
        "Short handover notes for your team",
      ],
    },
  ];

  const faqs = [
    {
      question: `Do you only work with ${tool || "this stack"}?`,
      answer: tool
        ? `This offer is focused on ${tool}-related ${problem}. Adjacent stacks are only included when they block the same outcome.`
        : "This offer is scoped to the researched problem/tool path described in the gig.",
    },
    {
      question: "What do you need from me to start?",
      answer:
        "Access notes, the error message/screenshots, and what “done” looks like for your use case.",
    },
    ...(input.deep.missing
      .filter((m) => m.category === "buyer_question")
      .slice(0, 2)
      .map((m) => ({
        question: m.item,
        answer: m.why,
      })) || []),
  ];

  const requirements = [
    "Describe the exact problem and when it started",
    tool ? `Confirm ${tool} version/environment if relevant` : "Share your current stack/environment",
    "Provide error logs, screenshots, or failing scenario steps",
    "State the desired working outcome",
  ];

  return {
    title,
    description: description.slice(0, 1200),
    tags,
    packages,
    faqs,
    requirements,
    changes: [],
    provider: "rule_based_research",
  };
}

export async function generateOptimizedGig(input: {
  snapshot: GigSnapshot;
  audit: GigAuditReport;
  deep: AnalyzerDeepResult;
  report: DeepResearchReport;
}): Promise<OptimizedGigBundle> {
  const ai = await geminiOptimize(input);
  if (ai) {
    ai.changes = buildChanges(input.snapshot, ai);
    return ai;
  }

  const bundle = ruleBasedOptimizedGig(input);
  bundle.changes = buildChanges(input.snapshot, bundle);
  return bundle;
}
