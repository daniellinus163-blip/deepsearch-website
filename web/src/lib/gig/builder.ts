import type { PositioningDraft } from "@/lib/positioning/engine";

export type GigPackage = {
  name: string;
  summary: string;
  includes: string[];
};

export type GigFaq = {
  question: string;
  answer: string;
};

export type GigDraftResult = {
  title: string;
  titleWhy: string;
  tags: string[];
  tagsWhy: string;
  description: string;
  descriptionWhy: string;
  packages: GigPackage[];
  packagesWhy: string;
  faqs: GigFaq[];
  faqsWhy: string;
  requirements: string[];
  requirementsWhy: string;
  deliveryStructure: string;
  deliveryWhy: string;
  buyerPositioning: string;
};

export type GigBuildInput = {
  mainService: string;
  positioning?: PositioningDraft | null;
  keywords?: string[];
  subServices?: string[];
  opportunityTitle?: string | null;
};

/**
 * Phase 11 Gig Builder — recommendations with WHY (rule-based, no AI).
 */
export function buildGigDraft(input: GigBuildInput): GigDraftResult {
  const service = input.mainService.trim();
  const niche =
    input.opportunityTitle?.trim() ||
    input.subServices?.[0] ||
    input.keywords?.find((k) => k.toLowerCase() !== service.toLowerCase()) ||
    service;
  const buyer = input.positioning?.targetBuyer || "your ideal buyer";
  const problem =
    input.positioning?.problem ||
    `generic ${service.toLowerCase()} that doesn't feel buyer-specific`;
  const result =
    input.positioning?.desiredResult ||
    `a clear, usable ${service.toLowerCase()} outcome`;

  const title = niche.toLowerCase().includes(service.toLowerCase().split(" ")[0] ?? "")
    ? niche
    : `${service} — ${niche}`;

  const tags = unique([
    service,
    niche,
    ...(input.keywords ?? []).slice(0, 6),
    ...(input.subServices ?? []).slice(0, 3),
  ]).slice(0, 8);

  const description = [
    `I help ${buyer.toLowerCase()} get ${result.toLowerCase()}.`,
    "",
    `If you're tired of ${problem.toLowerCase()}, this gig is built around a clearer fit — not generic ${service.toLowerCase()}.`,
    "",
    "What you get:",
    `- Focused ${service.toLowerCase()} aligned to your use case`,
    niche !== service ? `- Emphasis on: ${niche}` : `- Clear communication and revisions as listed`,
    `- Delivery structured around your requirements`,
    "",
    "Who this is for:",
    `- ${buyer}`,
    "",
    "Tell me your goal, references, and deadline — I'll confirm the best package before starting.",
  ].join("\n");

  const packages: GigPackage[] = [
    {
      name: "Basic",
      summary: `Essential ${service.toLowerCase()} for a single clear use case`,
      includes: ["1 concept direction", "Core deliverable", "2 revisions"],
    },
    {
      name: "Standard",
      summary: `Stronger fit for ${buyer.toLowerCase()} with more refinement`,
      includes: [
        "Deeper briefing",
        niche !== service ? `${niche} focus` : "Expanded deliverable",
        "4 revisions",
        "Source files where applicable",
      ],
    },
    {
      name: "Premium",
      summary: `Highest-touch package for a polished, buyer-ready result`,
      includes: [
        "Priority communication",
        "Full positioning-aligned deliverable",
        "Unlimited revisions within scope",
        "Usage/guidance notes",
      ],
    },
  ];

  const faqs: GigFaq[] = [
    {
      question: `Do you customize for my specific use case?`,
      answer: `Yes — this gig is positioned for ${buyer.toLowerCase()} and ${result.toLowerCase()}, not generic one-size-fits-all ${service.toLowerCase()}.`,
    },
    {
      question: "What do you need from me to start?",
      answer:
        "Share your goal, references/examples, any constraints, and your deadline. I'll confirm scope before work begins.",
    },
    {
      question: "How do packages differ?",
      answer:
        "Basic covers a focused deliverable, Standard adds refinement and niche emphasis, Premium is the highest-touch buyer-ready option.",
    },
  ];

  const requirements = [
    "Describe your goal and target audience",
    "Share references or examples you like",
    "List must-have features or constraints",
    "Confirm deadline and preferred package",
  ];

  const deliveryStructure = [
    "1) Brief confirmation",
    "2) First draft / concept",
    "3) Revision rounds per package",
    "4) Final delivery + notes",
  ].join(" → ");

  return {
    title,
    titleWhy:
      "Targets the core service while highlighting a specific buyer requirement or niche discovered during research.",
    tags,
    tagsWhy:
      "Mixes core service terms with secondary/long-tail phrases from your keyword hierarchy for clearer search relevance without stuffing duplicates.",
    description,
    descriptionWhy:
      "Opens with buyer + outcome, states the problem, then differentiates — matching the positioning chain instead of a generic service pitch.",
    packages,
    packagesWhy:
      "Packages differ by depth and buyer-fit, not just 'more of the same', so buyers can map use cases to a clear tier.",
    faqs,
    faqsWhy:
      "Answers likely objections around customization, requirements, and package differences before the buyer asks.",
    requirements,
    requirementsWhy:
      "Collects the inputs needed to deliver a niche-fit result and reduce back-and-forth after order.",
    deliveryStructure,
    deliveryWhy:
      "Makes the process visible: confirm → draft → revise → final, which builds trust and sets expectations.",
    buyerPositioning:
      input.positioning?.positioningStatement ||
      `Position around ${buyer} and ${niche}, not generic ${service}.`,
  };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}
