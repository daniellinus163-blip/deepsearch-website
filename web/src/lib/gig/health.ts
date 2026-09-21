export type HealthStatus = "pass" | "warn" | "fail";

export type HealthFinding = {
  section: "title" | "description" | "tags" | "packages" | "faq";
  check: string;
  status: HealthStatus;
  finding: string;
  fix: string;
};

export type GigHealthInput = {
  title?: string;
  description?: string;
  tags?: string[];
  packagesText?: string;
  faqText?: string;
  expectedService?: string | null;
  expectedKeywords?: string[];
};

/**
 * Phase 12 Gig Health Analyzer — specific findings & fixes, not one mystery score.
 */
export function analyzeGigHealth(input: GigHealthInput): HealthFinding[] {
  const findings: HealthFinding[] = [];
  const title = (input.title ?? "").trim();
  const description = (input.description ?? "").trim();
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const packagesText = (input.packagesText ?? "").trim();
  const faqText = (input.faqText ?? "").trim();
  const service = (input.expectedService ?? "").toLowerCase();
  const keywords = (input.expectedKeywords ?? []).map((k) => k.toLowerCase());

  // TITLE
  findings.push({
    section: "title",
    check: "Service clarity",
    status: title.length >= 8 ? "pass" : "fail",
    finding:
      title.length >= 8
        ? "Title is long enough to name the service."
        : "Title is missing or too short to clarify the service.",
    fix: "Use a clear service phrase buyers would search, e.g. include the core offer.",
  });

  const titleHasService =
    !service ||
    service
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((w) => title.toLowerCase().includes(w));
  findings.push({
    section: "title",
    check: "Search relevance",
    status: titleHasService ? "pass" : "warn",
    finding: titleHasService
      ? "Title appears related to your core service terms."
      : "Title may not include your core service language.",
    fix: "Add a primary service keyword near the start of the title.",
  });

  const titleHasBuyerSignal = /\bfor\b|\bcustom\b|\bwith\b/i.test(title);
  findings.push({
    section: "title",
    check: "Buyer intent",
    status: titleHasBuyerSignal ? "pass" : "warn",
    finding: titleHasBuyerSignal
      ? "Title includes a buyer-fit cue (for/custom/with)."
      : "Title is generic and may not signal buyer intent.",
    fix: "Add a niche cue such as audience, feature, or use case.",
  });

  // DESCRIPTION
  const hasProblem = /problem|tired|generic|instead|without|struggle|need/i.test(
    description
  );
  findings.push({
    section: "description",
    check: "Problem",
    status: hasProblem ? "pass" : "warn",
    finding: hasProblem
      ? "Description acknowledges a buyer problem or pain."
      : "Description does not clearly state the buyer problem.",
    fix: "Add one sentence about what generic options fail to do for this buyer.",
  });

  const hasOutcome = /get|result|help you|so you|outcome|deliver/i.test(
    description
  );
  findings.push({
    section: "description",
    check: "Outcome",
    status: description.length > 80 && hasOutcome ? "pass" : "warn",
    finding:
      description.length > 80 && hasOutcome
        ? "Description points to a buyer outcome."
        : "Outcome language is weak or the description is too short.",
    fix: "Open with who you help and the result they get.",
  });

  const hasDiff = /rather than|instead of|special|niche|specific|unlike/i.test(
    description
  );
  findings.push({
    section: "description",
    check: "Differentiation",
    status: hasDiff ? "pass" : "warn",
    finding: hasDiff
      ? "Some differentiation language is present."
      : "Differentiation is unclear — could sound like every other gig.",
    fix: "State what you do differently (feature, audience, or process).",
  });

  // TAGS
  findings.push({
    section: "tags",
    check: "Relevance",
    status: tags.length >= 3 ? "pass" : "warn",
    finding:
      tags.length >= 3
        ? "You provided a usable tag set."
        : "Too few tags to cover core + niche terms.",
    fix: "Include core service, 1–2 niche terms, and a buyer-intent phrase.",
  });

  const specificTags = tags.filter((t) => t.split(/\s+/).length >= 2);
  findings.push({
    section: "tags",
    check: "Specificity",
    status: specificTags.length >= 1 ? "pass" : "warn",
    finding:
      specificTags.length >= 1
        ? "At least one multi-word/specific tag is present."
        : "Tags look broad; missing long-tail specificity.",
    fix: "Add a long-tail tag from your keyword hierarchy.",
  });

  const unique = new Set(tags.map((t) => t.toLowerCase()));
  findings.push({
    section: "tags",
    check: "Duplication",
    status: unique.size === tags.length ? "pass" : "fail",
    finding:
      unique.size === tags.length
        ? "No duplicate tags detected."
        : "Duplicate tags reduce useful coverage.",
    fix: "Remove repeats and replace with distinct secondary/long-tail terms.",
  });

  if (keywords.length > 0) {
    const overlap = tags.some((t) =>
      keywords.some((k) => k.includes(t.toLowerCase()) || t.toLowerCase().includes(k.split(" ")[0] ?? ""))
    );
    findings.push({
      section: "tags",
      check: "Relevance",
      status: overlap ? "pass" : "warn",
      finding: overlap
        ? "Tags overlap with your research keywords."
        : "Tags do not clearly overlap research keywords.",
      fix: "Pull 2–3 tags directly from your generated keyword hierarchy.",
    });
  }

  // PACKAGES
  const packageLines = packagesText
    .split(/\n|•|-/)
    .map((l) => l.trim())
    .filter(Boolean);
  findings.push({
    section: "packages",
    check: "Clear differences",
    status: packageLines.length >= 2 ? "pass" : "warn",
    finding:
      packageLines.length >= 2
        ? "Multiple package lines detected."
        : "Packages are missing or not distinct enough in the pasted text.",
    fix: "Define Basic/Standard/Premium with different depth, not just price.",
  });

  const packageHasUseCase = /for |use case|creator|business|youtube|custom/i.test(
    packagesText
  );
  findings.push({
    section: "packages",
    check: "Buyer use cases",
    status: packageHasUseCase || packageLines.length >= 3 ? "pass" : "warn",
    finding: packageHasUseCase
      ? "Packages mention buyer/use-case language."
      : "Packages may not map to buyer use cases.",
    fix: "Name each package around a buyer situation (e.g. creator vs launch).",
  });

  // FAQ
  const faqHasObjection = /\?|revision|custom|refund|include|need|start/i.test(
    faqText
  );
  findings.push({
    section: "faq",
    check: "Objections",
    status: faqText.length > 20 && faqHasObjection ? "pass" : "warn",
    finding:
      faqText.length > 20 && faqHasObjection
        ? "FAQ appears to address common objections."
        : "FAQ is thin or missing objection handling.",
    fix: "Add FAQs for customization, revisions, and what you need to start.",
  });

  findings.push({
    section: "faq",
    check: "Requirements",
    status: /need|require|provide|send|share|brief/i.test(faqText)
      ? "pass"
      : "warn",
    finding: /need|require|provide|send|share|brief/i.test(faqText)
      ? "FAQ mentions buyer requirements/inputs."
      : "FAQ does not clarify buyer requirements.",
    fix: "Explain what buyers must provide before work starts.",
  });

  return findings;
}
