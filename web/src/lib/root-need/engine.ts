import type { IntentClassification } from "@/lib/intent/types";

export type RootNeedResult = {
  term: string;
  buyerIntent: string;
  buyerProblem: string;
  rootNeed: string;
  desiredOutcome: string;
  what: string;
  why: string;
  where: string;
  who: string;
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Phase 7 Root Need Engine — deepens intent into problem → need → outcome.
 * Rule-based (no AI).
 */
export function analyzeRootNeed(
  term: string,
  intent?: IntentClassification | null,
  mainService?: string | null
): RootNeedResult {
  const t = clean(term);
  const service =
    intent?.serviceLabel || mainService || t.replace(/\s+for\s+.+$/i, "").trim();
  const audience = intent?.audience;
  const useCase = intent?.useCase;
  const intentLabel = intent?.intentLabel || "exploratory";

  const buyerIntent = audience
    ? `Wants ${service.toLowerCase()} tailored for ${audience.toLowerCase()}`
    : useCase
      ? `Wants ${service.toLowerCase()} for ${useCase.toLowerCase()}`
      : `Wants a clearer, more specific ${service.toLowerCase()} result`;

  const buyerProblem =
    intent?.problem ||
    (/\bcustom\b|\bfurry\b|\bdynamic\b/i.test(t)
      ? "Doesn't want a generic off-the-shelf character or deliverable"
      : `Generic ${service.toLowerCase()} options feel too broad or interchangeable`);

  const rootNeed = audience
    ? `Needs a recognizable identity suited to ${audience.toLowerCase()}`
    : useCase
      ? `Needs a solution that clearly supports ${useCase.toLowerCase()}`
      : `Needs differentiation and clarity in ${service.toLowerCase()}`;

  const desiredOutcome = intent?.outcome
    ? intent.outcome
    : audience || useCase
      ? `Wants ${service.toLowerCase()} that fits their ${
          audience?.toLowerCase() || useCase?.toLowerCase()
        } context`
      : `Wants a professional result they can confidently buy and use`;

  const what = `${t} points to demand for ${service.toLowerCase()}${
    audience ? ` aimed at ${audience.toLowerCase()}` : ""
  }${useCase ? ` used for ${useCase.toLowerCase()}` : ""}.`;

  const why = `Buyers searching this way are usually ${intentLabel.replace(
    /-/g,
    " "
  )} — they care about fit, not just the broad service name.`;

  const where = [
    "Gig titles and opening lines",
    "Package names that mirror the niche",
    "Tags and FAQ that address the specific use case",
    "Research notes when comparing competitor listings",
  ].join("; ");

  const who =
    audience ||
    (useCase ? `Buyers focused on ${useCase.toLowerCase()}` : null) ||
    `Buyers comparing ${service.toLowerCase()} options`;

  return {
    term: t,
    buyerIntent,
    buyerProblem,
    rootNeed,
    desiredOutcome,
    what,
    why,
    where,
    who,
  };
}
