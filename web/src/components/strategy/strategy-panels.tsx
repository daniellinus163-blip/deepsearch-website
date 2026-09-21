"use client";

import { useState, useTransition } from "react";
import {
  runCompetitionAnalysis,
  runOpportunityGapAnalysis,
  runRootNeedAnalysis,
} from "@/app/actions/strategy";
import { Button } from "@/components/ui/button";
import type {
  CompetitionReport,
  RootNeedAnalysis,
  SavedOpportunity,
} from "@/lib/types/database";

type StrategyPanelsProps = {
  serviceId: string;
  rootNeeds: RootNeedAnalysis[];
  competition: CompetitionReport | null;
  opportunities: SavedOpportunity[];
};

export function StrategyPanels({
  serviceId,
  rootNeeds,
  competition,
  opportunities,
}: StrategyPanelsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message: string }>
  ) {
    const formData = new FormData();
    formData.set("service_id", serviceId);
    startTransition(async () => {
      const result = await action(formData);
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-14">
      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      {/* Phase 7 */}
      <section className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Root need
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Search term → intent → problem → root need → desired outcome
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(runRootNeedAnalysis)}
          >
            {pending ? "Working…" : rootNeeds.length ? "Re-map root needs" : "Map root needs"}
          </Button>
        </div>

        {rootNeeds.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Analyze buyer intent first, then map root needs for each term.
          </p>
        ) : (
          <ul className="space-y-5">
            {rootNeeds.map((item) => (
              <li key={item.id} className="border-b border-[var(--border)] py-4">
                <p className="font-medium">{item.term}</p>
                <div className="mt-3 space-y-1 text-sm text-[var(--muted-foreground)]">
                  <p>Intent: {item.buyer_intent}</p>
                  <p>Problem: {item.buyer_problem}</p>
                  <p>Root need: {item.root_need}</p>
                  <p>Outcome: {item.desired_outcome}</p>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      What
                    </dt>
                    <dd>{item.what_text}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Why
                    </dt>
                    <dd>{item.why_text}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Where
                    </dt>
                    <dd>{item.where_text}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Who
                    </dt>
                    <dd>{item.who_text}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Phase 8 */}
      <section className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Competition intelligence
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              DeepSearch Competition Signal from observable listing data — not an
              official marketplace score.
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(runCompetitionAnalysis)}
          >
            {pending
              ? "Working…"
              : competition
                ? "Refresh competition"
                : "Analyze competition"}
          </Button>
        </div>

        {!competition ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Save Fiverr listings with the extension, then run competition analysis.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <p>
              Listings analyzed:{" "}
              <span className="font-medium">{competition.listings_analyzed}</span>
            </p>
            <p>
              DeepSearch Competition Signal:{" "}
              <span className="font-medium">
                {Number(competition.competition_signal).toFixed(2)}
              </span>
            </p>
            {competition.summary ? (
              <p className="text-[var(--muted-foreground)]">{competition.summary}</p>
            ) : null}
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Common positioning
              </p>
              <p className="mt-1">
                {competition.common_positioning.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Common price range
              </p>
              <p className="mt-1">
                {competition.common_price_min != null
                  ? `${competition.currency ?? ""} ${competition.common_price_min} – ${competition.common_price_max} (avg ${competition.common_price_avg})`
                  : "Not enough price data"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Common delivery
              </p>
              <p className="mt-1">
                {competition.common_delivery.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Repeated buyer language
              </p>
              <p className="mt-1">
                {competition.repeated_buyer_language.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Missing positioning
              </p>
              <p className="mt-1">
                {competition.missing_positioning.join(", ") || "—"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Phase 9 */}
      <section className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Opportunity gaps
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Demand signals + competitor positioning → gaps with explanations
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(runOpportunityGapAnalysis)}
          >
            {pending
              ? "Working…"
              : opportunities.length
                ? "Refresh gaps"
                : "Find opportunity gaps"}
          </Button>
        </div>

        {opportunities.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate keywords (and ideally capture listings), then find gaps.
          </p>
        ) : (
          <ul className="space-y-4">
            {opportunities.map((item) => (
              <li key={item.id} className="border-b border-[var(--border)] py-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Buyer intent: {item.buyer_intent} · Competition:{" "}
                  {item.competition_signal} · Specificity: {item.specificity} ·
                  Service fit: {item.service_fit}
                  {item.gap_score != null
                    ? ` · Gap score ${Number(item.gap_score).toFixed(2)}`
                    : ""}
                </p>
                {item.why_identified ? (
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Why: {item.why_identified}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
