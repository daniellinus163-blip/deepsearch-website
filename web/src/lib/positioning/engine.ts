export type PositioningInput = {
  mainService: string;
  targetBuyer?: string | null;
  problem?: string | null;
  desiredResult?: string | null;
  differentiatorHints?: string[];
  opportunityTitle?: string | null;
};

export type PositioningDraft = {
  targetBuyer: string;
  problem: string;
  desiredResult: string;
  serviceOffer: string;
  differentiator: string;
  positioningStatement: string;
};

/**
 * Phase 10 Service Positioning Engine (rule-based).
 */
export function buildServicePositioning(input: PositioningInput): PositioningDraft {
  const service = input.mainService.trim();
  const targetBuyer =
    input.targetBuyer?.trim() ||
    `Buyers looking for ${service.toLowerCase()}`;
  const problem =
    input.problem?.trim() ||
    `Generic ${service.toLowerCase()} options feel too broad and don't signal a clear fit`;
  const desiredResult =
    input.desiredResult?.trim() ||
    `A clear, specific ${service.toLowerCase()} result they can use with confidence`;

  const hint =
    input.differentiatorHints?.find(Boolean) ||
    input.opportunityTitle ||
    null;

  const differentiator = hint
    ? `Lead with ${hint} instead of generic ${service.toLowerCase()} positioning`
    : `Specialize around a concrete buyer context and feature set rather than generic ${service.toLowerCase()}`;

  const positioningStatement = `For ${targetBuyer} who need ${desiredResult.toLowerCase()}, offer ${service.toLowerCase()} with a clear niche angle (${
    hint || "specific buyer-fit"
  }) rather than positioning the service as generic ${service.toLowerCase()}.`;

  return {
    targetBuyer,
    problem,
    desiredResult,
    serviceOffer: service,
    differentiator,
    positioningStatement,
  };
}
