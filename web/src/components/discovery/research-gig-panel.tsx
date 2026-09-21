"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ResearchGigResult } from "@/lib/gig/from-research";

function CopyButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
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

function formatFullGig(result: ResearchGigResult): string {
  const { gig } = result;
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
    `TITLE\n${gig.title}`,
    `TAGS\n${gig.tags.join(", ")}`,
    `DESCRIPTION\n${gig.description}`,
    `PACKAGES\n${packages}`,
    `FAQs\n${faqs}`,
    `REQUIREMENTS\n${gig.requirements.map((r) => `- ${r}`).join("\n")}`,
    `DELIVERY\n${gig.deliveryStructure}`,
    `POSITIONING\n${gig.buyerPositioning}`,
  ].join("\n\n");
}

export function ResearchGigPanel({ result }: { result: ResearchGigResult }) {
  const { gig, explanation } = result;
  const basic = gig.packages.find((p) => /basic/i.test(p.name)) || gig.packages[0];
  const standard =
    gig.packages.find((p) => /standard/i.test(p.name)) || gig.packages[1];
  const premium =
    gig.packages.find((p) => /premium/i.test(p.name)) || gig.packages[2];

  return (
    <div className="space-y-6 border-t border-[var(--border)] pt-6">
      <div className="space-y-1">
        <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Fiverr-style gig (from research)
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Provider: {result.provider} · Starting:{" "}
          {result.researchTrace.startingSearch} → {gig.title}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton label="Copy title" text={gig.title} />
        <CopyButton label="Copy description" text={gig.description} />
        <CopyButton label="Copy tags" text={gig.tags.join(", ")} />
        {basic ? (
          <CopyButton
            label="Copy Basic"
            text={`${basic.name}\n${basic.summary}\n${basic.includes.join("\n")}`}
          />
        ) : null}
        {standard ? (
          <CopyButton
            label="Copy Standard"
            text={`${standard.name}\n${standard.summary}\n${standard.includes.join("\n")}`}
          />
        ) : null}
        {premium ? (
          <CopyButton
            label="Copy Premium"
            text={`${premium.name}\n${premium.summary}\n${premium.includes.join("\n")}`}
          />
        ) : null}
        <CopyButton
          label="Copy FAQs"
          text={gig.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}
        />
        <CopyButton
          label="Copy requirements"
          text={gig.requirements.join("\n")}
        />
        <CopyButton label="Copy full gig" text={formatFullGig(result)} />
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Gig title
        </h3>
        <p className="text-sm font-medium">{gig.title}</p>
        <p className="text-xs text-[var(--muted-foreground)]">WHY: {gig.titleWhy}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Description
        </h3>
        <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--foreground)]">
          {gig.description}
        </pre>
        <p className="text-xs text-[var(--muted-foreground)]">
          WHY: {gig.descriptionWhy}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Search tags
        </h3>
        <p className="text-sm">{gig.tags.join(", ")}</p>
        <ul className="space-y-1">
          {explanation.tagReasons.map((t) => (
            <li key={t.tag} className="text-xs text-[var(--muted-foreground)]">
              {t.tag}: {t.reason}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Packages
        </h3>
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
        <p className="text-xs text-[var(--muted-foreground)]">
          WHY: {gig.packagesWhy}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          FAQs
        </h3>
        {gig.faqs.map((faq) => (
          <div key={faq.question} className="space-y-1">
            <p className="text-sm font-medium">{faq.question}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{faq.answer}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Buyer requirements
        </h3>
        <ul className="list-disc pl-5 text-sm">
          {gig.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Positioning
        </h3>
        <p className="text-sm">{gig.buyerPositioning}</p>
      </section>

      <section className="space-y-3 border border-[var(--border)] px-4 py-4">
        <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
          Why this gig uses these terms
        </h3>
        <p className="text-sm">
          <span className="font-medium">Primary term:</span>{" "}
          {explanation.primaryTerm}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Reason: {explanation.primaryReason}
        </p>
        {explanation.relatedTerms.map((t) => (
          <div key={t.term} className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Related term:</span> {t.term}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Reason: {t.reason}
            </p>
          </div>
        ))}
        <p className="text-sm">
          <span className="font-medium">Buyer need:</span> {explanation.buyerNeed}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Reason: {explanation.buyerNeedReason}
        </p>
        <p className="text-sm">
          <span className="font-medium">Positioning:</span>{" "}
          {explanation.positioning}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Reason: {explanation.positioningReason}
        </p>
      </section>
    </div>
  );
}
