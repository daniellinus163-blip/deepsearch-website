"use client";

import { useState, useTransition } from "react";
import {
  analyzeExistingGig,
  generateGigDraft,
  generatePositioning,
} from "@/app/actions/listing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  GigDraft,
  GigHealthReport,
  ServicePositioning,
} from "@/lib/types/database";

type ListingPanelsProps = {
  serviceId: string;
  positioning: ServicePositioning | null;
  gigDraft: GigDraft | null;
  healthReport: GigHealthReport | null;
};

export function ListingPanels({
  serviceId,
  positioning,
  gigDraft,
  healthReport,
}: ListingPanelsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message: string }>,
    formData?: FormData
  ) {
    const data = formData ?? new FormData();
    if (!data.get("service_id")) data.set("service_id", serviceId);
    startTransition(async () => {
      const result = await action(data);
      setMessage(result.message);
    });
  }

  const packages = Array.isArray(gigDraft?.packages) ? gigDraft.packages : [];
  const faqs = Array.isArray(gigDraft?.faqs) ? gigDraft.faqs : [];
  const findings = Array.isArray(healthReport?.findings)
    ? healthReport.findings
    : [];

  return (
    <div className="space-y-14">
      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      {/* Phase 10 */}
      <section className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Service positioning
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Target buyer → problem → desired result → service → differentiator
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(generatePositioning)}
          >
            {pending
              ? "Working…"
              : positioning
                ? "Refresh positioning"
                : "Generate positioning"}
          </Button>
        </div>

        {!positioning ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Map root needs / opportunities first for a stronger positioning
            statement.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Target buyer
              </span>
              <br />
              {positioning.target_buyer}
            </p>
            <p>
              <span className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Problem
              </span>
              <br />
              {positioning.problem}
            </p>
            <p>
              <span className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Desired result
              </span>
              <br />
              {positioning.desired_result}
            </p>
            <p>
              <span className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Service
              </span>
              <br />
              {positioning.service_offer}
            </p>
            <p>
              <span className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Differentiator
              </span>
              <br />
              {positioning.differentiator}
            </p>
            <p className="border-t border-[var(--border)] pt-3 text-[var(--muted-foreground)]">
              {positioning.positioning_statement}
            </p>
          </div>
        )}
      </section>

      {/* Phase 11 */}
      <section className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Gig builder
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Listing recommendations with a WHY for each part
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(generateGigDraft)}
          >
            {pending
              ? "Working…"
              : gigDraft
                ? "Regenerate gig draft"
                : "Build gig draft"}
          </Button>
        </div>

        {!gigDraft ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate positioning, then build a gig draft.
          </p>
        ) : (
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-medium">{gigDraft.title}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.title_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Tags
              </p>
              <p className="mt-1">{gigDraft.tags.join(", ")}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.tags_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Description
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                {gigDraft.description}
              </pre>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.description_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Packages
              </p>
              <ul className="mt-2 space-y-2">
                {packages.map((pkg, index) => {
                  const item = pkg as {
                    name?: string;
                    summary?: string;
                    includes?: string[];
                  };
                  return (
                    <li key={index}>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[var(--muted-foreground)]">
                        {item.summary}
                      </p>
                      {item.includes?.length ? (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {item.includes.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.packages_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                FAQs
              </p>
              <ul className="mt-2 space-y-2">
                {faqs.map((faq, index) => {
                  const item = faq as { question?: string; answer?: string };
                  return (
                    <li key={index}>
                      <p className="font-medium">{item.question}</p>
                      <p className="text-[var(--muted-foreground)]">
                        {item.answer}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.faqs_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Requirements
              </p>
              <p className="mt-1">{gigDraft.requirements.join(" · ")}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.requirements_why}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                Delivery structure
              </p>
              <p className="mt-1">{gigDraft.delivery_structure}</p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                WHY: {gigDraft.delivery_why}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Phase 12 */}
      <section className="max-w-3xl space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Gig health analyzer
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Paste an existing listing — get specific findings and fixes, not one
            mystery score.
          </p>
        </div>

        <form
          className="space-y-4"
          action={(formData) => run(analyzeExistingGig, formData)}
        >
          <input type="hidden" name="service_id" value={serviceId} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Your current gig title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Paste your gig description"
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="Comma-separated tags"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packages">Packages</Label>
            <Textarea
              id="packages"
              name="packages"
              placeholder="Paste package names/details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq">FAQ</Label>
            <Textarea id="faq" name="faq" placeholder="Paste FAQ text" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Analyze gig health"}
          </Button>
        </form>

        {findings.length > 0 ? (
          <ul className="space-y-3">
            {findings.map((item, index) => (
              <li
                key={`${item.section}-${item.check}-${index}`}
                className="border-b border-[var(--border)] py-3 text-sm"
              >
                <p className="font-medium">
                  {item.section.toUpperCase()} · {item.check} ·{" "}
                  <span className="text-[var(--muted-foreground)]">
                    {item.status}
                  </span>
                </p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {item.finding}
                </p>
                <p className="mt-1">Fix: {item.fix}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
