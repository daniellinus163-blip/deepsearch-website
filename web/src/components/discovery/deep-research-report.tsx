"use client";

import type {
  BuyerNeedExplanation,
  ConfidenceLevel,
  DeepResearchReport,
  Finding,
  SearchTermEntry,
} from "@/lib/research/types";

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const label =
    level === "strong"
      ? "Strong evidence"
      : level === "moderate"
        ? "Moderate evidence"
        : level === "weak"
          ? "Weak evidence"
          : level === "hypothesis"
            ? "Hypothesis"
            : "Insufficient";

  return (
    <span className="text-[10px] tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
      {label}
    </span>
  );
}

function FindingList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Finding[];
  empty?: string;
}) {
  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-5">
      <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {empty ?? "Evidence insufficient for this section."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={`${title}-${item.label}`} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-[var(--foreground)]">{item.label}</p>
                <ConfidenceBadge level={item.confidence} />
              </div>
              {item.why ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Why: {item.why}
                </p>
              ) : null}
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {item.kind.replace(/_/g, " ")}
                {item.evidenceIds.length
                  ? ` · ${item.evidenceIds.join(", ")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WhyBuyersNeedSection({ items }: { items: BuyerNeedExplanation[] }) {
  return (
    <section className="space-y-4 border-t border-[var(--border)] pt-5">
      <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
        Why buyers need this
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Insufficient evidence for buyer-need explanations.
        </p>
      ) : (
        items.map((item) => (
          <div
            key={`${item.buyerNeed}-${item.problem}`}
            className="space-y-2 border-b border-[var(--border)] pb-4 last:border-b-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{item.buyerNeed}</p>
              <ConfidenceBadge level={item.confidence} />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">Problem:</span>{" "}
              {item.problem}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">
                Desired outcome:
              </span>{" "}
              {item.desiredOutcome}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">Evidence:</span>{" "}
              {item.evidence}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">
                Opportunity:
              </span>{" "}
              {item.opportunity}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">
                Why it matters:
              </span>{" "}
              {item.whyItMatters}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {item.kind.replace(/_/g, " ")}
            </p>
          </div>
        ))
      )}
    </section>
  );
}

function SearchTermHierarchy({ terms }: { terms: SearchTermEntry[] }) {
  return (
    <section className="space-y-3 border-t border-[var(--border)] pt-5">
      <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
        Important & deeper search terms
      </h3>
      {terms.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No search-term hierarchy built yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {terms.map((t) => (
            <li key={`${t.type}-${t.term}`} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-[var(--foreground)]">
                  <span className="text-[var(--muted-foreground)]">
                    {t.type.replace(/_/g, " ")}:
                  </span>{" "}
                  {t.term}
                </p>
                <ConfidenceBadge level={t.confidence} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t.relationship} — {t.why}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DeepResearchReportView({
  report,
  confidenceSummary,
  onBuildGig,
  onBuildMultiGigs,
  buildingGig,
}: {
  report: DeepResearchReport;
  confidenceSummary: string;
  onBuildGig?: () => void;
  onBuildMultiGigs?: () => void;
  buildingGig?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          DeepSearch report
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {report.coreService}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Starting search: {report.query}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Marketplace:{" "}
          {report.marketplaces.length
            ? report.marketplaces.join(", ")
            : "None selected in Settings — add Fiverr to include Fiverr research"}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Research depth: {report.researchDepth}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {report.fiverrLimitationNote}
        </p>
        <p className="text-sm text-[var(--foreground)]">
          {report.serviceUnderstanding}
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Confidence: {confidenceSummary}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Adapters: {report.adaptersUsed.join(", ") || "none"} · Reasoning:{" "}
          {report.reasoningProvider} ·{" "}
          {new Date(report.researchedAt).toLocaleString()}
        </p>
      </div>

      {report.insufficientNotes.length > 0 ? (
        <div className="space-y-2 border border-[var(--border)] px-4 py-3">
          <p className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
            Evidence notes
          </p>
          <ul className="space-y-1.5">
            {report.insufficientNotes.map((note) => (
              <li key={note} className="text-sm text-[var(--muted-foreground)]">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FindingList
        title="What this service really represents / branches"
        items={report.serviceBranches}
      />
      <FindingList title="Buyer types" items={report.buyerTypes} />
      <FindingList title="Buyer problems" items={report.buyerProblems} />
      <FindingList title="Discovered tools / platforms" items={report.discoveredTools} />

      <section className="space-y-4 border-t border-[var(--border)] pt-5">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Problem depth
        </h3>
        {(report.problemDepths ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No specific problems extracted yet.
          </p>
        ) : (
          (report.problemDepths ?? []).map((p) => (
            <div
              key={p.problem}
              className="space-y-1 border-b border-[var(--border)] pb-3 last:border-b-0"
            >
              <p className="text-sm font-medium">{p.problem}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Who: {p.who}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tool/platform: {p.toolPlatform}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Why they need help: {p.whyTheyNeedHelp}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Desired outcome: {p.desiredOutcome}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Service required: {p.serviceRequired}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Evidence: {p.evidence}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Opportunity: {p.opportunity}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-5">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Deep tag pool ({(report.nicheTagPool ?? []).length})
        </h3>
        {(report.nicheTagPool ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No niche tags yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {(report.nicheTagPool ?? []).slice(0, 25).map((t) => (
              <li key={`${t.type}-${t.tag}`} className="space-y-0.5">
                <p className="text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    {t.type}:
                  </span>{" "}
                  {t.tag}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t.reasonItMatters}
                  {t.relatedTool ? ` · Tool: ${t.relatedTool}` : ""}
                  {t.relatedProblem ? ` · Problem: ${t.relatedProblem}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-5">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Niche opportunities ({(report.microNiches ?? []).length}/4)
        </h3>
        {(report.microNiches ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No distinct micro-niches formed from current evidence.
          </p>
        ) : (
          (report.microNiches ?? []).map((n) => (
            <div
              key={n.id}
              className="space-y-1 border-b border-[var(--border)] pb-3 last:border-b-0"
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Buyer: {n.buyer} · Service: {n.service}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tags: {n.tagCluster.join(", ")}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Competition: {n.competition.level.replace(/_/g, " ")} —{" "}
                {n.competition.why}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Why tags belong: {n.whyTagsBelongTogether}
              </p>
            </div>
          ))
        )}
      </section>

      <FindingList title="Use cases" items={report.useCases} />
      <FindingList
        title="Buyer intent"
        items={report.relatedTerms.buyerIntent}
      />
      <SearchTermHierarchy terms={report.searchTermHierarchy} />
      <FindingList title="Root buyer needs" items={report.rootNeeds} />
      <FindingList
        title="Competitor patterns"
        items={report.competitorObservations}
        empty="No Fiverr/marketplace competitor observations yet. Capture public gig pages with the extension."
      />
      <FindingList
        title="Potential positioning gaps"
        items={report.opportunityGaps}
      />
      <FindingList
        title="Recommended service positioning"
        items={report.recommendedPositioning}
      />
      <WhyBuyersNeedSection items={report.whyBuyersNeed} />

      <section className="space-y-3 border-t border-[var(--border)] pt-5">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Evidence
        </h3>
        {report.evidence.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No evidence documents collected.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.evidence.map((ev) => (
              <li key={ev.id} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-[var(--foreground)]">
                    {ev.id} · {ev.source} · {ev.kind.replace(/_/g, " ")}
                  </p>
                  <ConfidenceBadge level={ev.confidence} />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {ev.snippet}
                </p>
                {ev.url ? (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline underline-offset-2 text-[var(--muted-foreground)]"
                  >
                    Source link
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-5">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Confidence legend
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          Observed = public/curated fields · Inferred = pattern from sources ·
          AI interpretation = Gemini reading evidence · Opportunity hypothesis =
          worth investigating — never invented marketplace stats or private
          Fiverr data.
        </p>
      </section>

      {onBuildGig || onBuildMultiGigs ? (
        <section className="space-y-3 border-t border-[var(--border)] pt-5">
          <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
            Build Fiverr gigs
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate up to 4 distinct micro-niche gigs from problem + tool +
            service clusters — not rewrites of the same broad tag.
          </p>
          <div className="flex flex-wrap gap-2">
            {onBuildMultiGigs ? (
              <button
                type="button"
                onClick={onBuildMultiGigs}
                disabled={buildingGig}
                className="inline-flex h-10 items-center justify-center bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] disabled:opacity-60"
              >
                {buildingGig
                  ? "Building niche gigs…"
                  : "Build up to 4 niche gigs"}
              </button>
            ) : null}
            {onBuildGig ? (
              <button
                type="button"
                onClick={onBuildGig}
                disabled={buildingGig}
                className="inline-flex h-10 items-center justify-center border border-[var(--border)] px-4 text-sm disabled:opacity-60"
              >
                {buildingGig ? "Building…" : "Build single gig (legacy)"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <FindingList
        title="Features / requirements"
        items={report.features}
        empty="None identified"
      />
      <FindingList
        title="Non-obvious discoveries"
        items={report.nonObvious}
        empty="No non-obvious findings yet."
      />
    </div>
  );
}
