"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MultiGigDraft, MultiGigResult } from "@/lib/gig/multi-from-research";

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-8 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function formatFullGig(draft: MultiGigDraft): string {
  const { gig } = draft;
  const packages = gig.packages
    .map(
      (p) =>
        `${p.name}\n${p.summary}\n${p.includes.map((i) => `- ${i}`).join("\n")}`
    )
    .join("\n\n");
  const faqs = gig.faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  return [
    `NICHE\n${draft.nicheTitle}`,
    `TITLE\n${gig.title}`,
    `TAGS\n${gig.tags.join(", ")}`,
    `DESCRIPTION\n${gig.description}`,
    `PACKAGES\n${packages}`,
    `FAQs\n${faqs}`,
    `REQUIREMENTS\n${gig.requirements.map((r) => `- ${r}`).join("\n")}`,
    `POSITIONING\n${gig.buyerPositioning}`,
  ].join("\n\n");
}

function GigCard({ draft }: { draft: MultiGigDraft }) {
  const { gig, explanation } = draft;
  return (
    <article className="space-y-5 border border-[var(--border)] px-4 py-5">
      <div className="space-y-1">
        <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          {draft.nicheId} · {draft.nicheTitle}
        </p>
        <h3 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
          {gig.title}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          Provider: {draft.provider}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton label="Copy title" text={gig.title} />
        <CopyButton label="Copy description" text={gig.description} />
        <CopyButton label="Copy tags" text={gig.tags.join(", ")} />
        {gig.packages.map((pkg) => (
          <CopyButton
            key={pkg.name}
            label={`Copy ${pkg.name}`}
            text={`${pkg.name}\n${pkg.summary}\n${pkg.includes.join("\n")}`}
          />
        ))}
        <CopyButton
          label="Copy FAQs"
          text={gig.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}
        />
        <CopyButton
          label="Copy requirements"
          text={gig.requirements.join("\n")}
        />
        <CopyButton label="Copy full gig" text={formatFullGig(draft)} />
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Description
        </h4>
        <pre className="whitespace-pre-wrap font-sans text-sm">{gig.description}</pre>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Tags
        </h4>
        <p className="text-sm">{gig.tags.join(", ")}</p>
        <ul className="space-y-1">
          {draft.tagReasons.map((t) => (
            <li key={t.tag} className="text-xs text-[var(--muted-foreground)]">
              {t.tag}: {t.reason}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Packages
        </h4>
        {gig.packages.map((pkg) => (
          <div key={pkg.name} className="space-y-1">
            <p className="text-sm font-medium">
              {pkg.name} — {pkg.summary}
            </p>
            <ul className="list-disc pl-5 text-sm text-[var(--muted-foreground)]">
              {pkg.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          FAQs
        </h4>
        {gig.faqs.map((faq) => (
          <div key={faq.question} className="space-y-1">
            <p className="text-sm font-medium">{faq.question}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{faq.answer}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Requirements
        </h4>
        <ul className="list-disc pl-5 text-sm">
          {gig.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border border-[var(--border)] px-3 py-3">
        <h4 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Why this niche / tags / evidence
        </h4>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">Why selected:</span>{" "}
          {explanation.whyNicheSelected}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">Problem:</span>{" "}
          {explanation.buyerProblem}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">Tool/platform:</span>{" "}
          {explanation.toolPlatform}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">Buyer need:</span>{" "}
          {explanation.buyerNeed}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            Competition signal:
          </span>{" "}
          {explanation.competitionSignal}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            Why tags grouped:
          </span>{" "}
          {explanation.whyTagsGrouped}
        </p>
        <ul className="space-y-1">
          {explanation.marketEvidence.map((e) => (
            <li key={e} className="text-xs text-[var(--muted-foreground)]">
              {e}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.08em]">
          Confidence: {explanation.confidence}
        </p>
      </section>
    </article>
  );
}

export function MultiGigPanel({ result }: { result: MultiGigResult }) {
  return (
    <div className="space-y-6 border-t border-[var(--border)] pt-6">
      <div className="space-y-1">
        <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Gig clusters (up to 4 distinct micro-niches)
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Depth: {result.researchTrace.researchDepth} · Tag pool:{" "}
          {result.researchTrace.tagPoolSize} · Starting:{" "}
          {result.researchTrace.startingSearch}
        </p>
      </div>
      {result.gigs.map((draft) => (
        <GigCard key={draft.nicheId} draft={draft} />
      ))}
    </div>
  );
}
