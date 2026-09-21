import type { CompetitionReportDraft } from "@/lib/competition/engine";
import type { Keyword } from "@/lib/types/database";
import type { IntentClassification } from "@/lib/intent/types";

export type OpportunityGapDraft = {
  title: string;
  summary: string;
  marketplace: string;
  buyerIntent: string;
  competitionSignal: string;
  specificity: string;
  serviceFit: string;
  demandSignal: string;
  whyIdentified: string;
  gapScore: number;
};

function level(score: number): "High" | "Medium" | "Low" {
  if (score >= 0.67) return "High";
  if (score >= 0.34) return "Medium";
  return "Low";
}

/**
 * Phase 9 Opportunity Gap Engine.
 * Demand signals + competitor positioning → gaps with explanations.
 */
export function findOpportunityGaps(input: {
  keywords: Keyword[];
  intents: IntentClassification[];
  competition: CompetitionReportDraft;
  mainService: string;
  marketplace?: string;
}): OpportunityGapDraft[] {
  const { keywords, intents, competition, mainService } = input;
  const marketplace = input.marketplace ?? "Fiverr";
  const intentByTerm = new Map(
    intents.map((i) => [i.term.toLowerCase(), i])
  );
  const missing = new Set(
    competition.missingPositioning.map((m) => m.toLowerCase())
  );

  const candidates = keywords.filter((k) =>
    ["secondary", "long_tail", "buyer_intent"].includes(k.level)
  );

  const gaps: OpportunityGapDraft[] = [];

  for (const keyword of candidates) {
    const intent = intentByTerm.get(keyword.term.toLowerCase());
    const demand =
      keyword.level === "buyer_intent"
        ? Math.max(Number(keyword.relevance), 0.7)
        : Number(keyword.relevance);
    const specificity = Number(keyword.specificity);
    const keywordCompetition = Number(keyword.competition_signal);
    const marketCompetition = competition.competitionSignal;
    const combinedCompetition =
      competition.listingsAnalyzed > 0
        ? (keywordCompetition * 0.4 + marketCompetition * 0.6)
        : keywordCompetition;

    const isMissingTheme = [...missing].some((m) =>
      keyword.term.toLowerCase().includes(m.split(" ")[0] ?? m)
    );

    const serviceFit =
      keyword.term.toLowerCase().includes(mainService.split(" ")[0]?.toLowerCase() ?? "") ||
      Number(keyword.relevance) >= 0.55
        ? 0.85
        : 0.55;

    // Opportunity = high demand + high specificity + lower competition
    const gapScore = Number(
      (
        demand * 0.35 +
        specificity * 0.25 +
        (1 - combinedCompetition) * 0.3 +
        serviceFit * 0.1 +
        (isMissingTheme ? 0.08 : 0)
      ).toFixed(2)
    );

    if (gapScore < 0.55 && !isMissingTheme) continue;

    const whyParts = [
      `Buyer-facing term "${keyword.term}" shows ${level(demand).toLowerCase()} demand signal and ${level(specificity).toLowerCase()} specificity.`,
      `DeepSearch Competition Signal is ${level(combinedCompetition).toLowerCase()} (${combinedCompetition.toFixed(2)}) based on keyword heuristics${
        competition.listingsAnalyzed > 0
          ? " and saved observable listings"
          : ""
      }.`,
    ];
    if (intent?.audience) {
      whyParts.push(`Audience focus: ${intent.audience}.`);
    }
    if (intent?.useCase) {
      whyParts.push(`Use case focus: ${intent.useCase}.`);
    }
    if (isMissingTheme) {
      whyParts.push(
        "Competitor positioning appears weaker on this theme in your saved observable listings."
      );
    }
    if (competition.listingsAnalyzed === 0) {
      whyParts.push(
        "Competition estimate is keyword-heuristic only until more listings are captured."
      );
    }

    gaps.push({
      title: keyword.term,
      summary: `Opportunity around ${keyword.term} for ${mainService}.`,
      marketplace,
      buyerIntent: level(demand),
      competitionSignal: level(combinedCompetition),
      specificity: level(specificity),
      serviceFit: level(serviceFit),
      demandSignal: level(demand),
      whyIdentified: whyParts.join(" "),
      gapScore,
    });
  }

  // Also surface explicit missing positioning themes
  for (const theme of competition.missingPositioning.slice(0, 5)) {
    if (gaps.some((g) => g.title.toLowerCase() === theme.toLowerCase())) continue;
    gaps.push({
      title: `${theme}-focused ${mainService}`,
      summary: `Gap: demand language around "${theme}" is underrepresented in competitor positioning.`,
      marketplace,
      buyerIntent: "High",
      competitionSignal: "Low",
      specificity: "High",
      serviceFit: "High",
      demandSignal: "High",
      whyIdentified: `Buyer demand signals mention "${theme}", but your saved competitor listings show weaker coverage of this positioning. That creates a differentiation opening.`,
      gapScore: 0.78,
    });
  }

  return gaps
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 12);
}
