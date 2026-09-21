"use client";

import { useState, useTransition } from "react";
import { analyzeBuyerIntentForService } from "@/app/actions/intent";
import { Button } from "@/components/ui/button";
import { INTENT_CATEGORY_LABELS, type IntentCategory } from "@/lib/intent/types";
import type { BuyerIntentAnalysis } from "@/lib/types/database";

type BuyerIntentPanelProps = {
  serviceId: string;
  analyses: BuyerIntentAnalysis[];
};

export function BuyerIntentPanel({
  serviceId,
  analyses,
}: BuyerIntentPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Buyer intent
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Not “what keyword is popular?” — what does the buyer actually want?
          </p>
        </div>
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await analyzeBuyerIntentForService(formData);
              setMessage(result.message);
            });
          }}
        >
          <input type="hidden" name="service_id" value={serviceId} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending
              ? "Analyzing…"
              : analyses.length
                ? "Re-analyze intent"
                : "Analyze buyer intent"}
          </Button>
        </form>
      </div>

      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      {analyses.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate keywords first (recommended), then analyze intent. Example:
          “Roblox character for YouTube” → audience YouTube creator, use case
          content creation, purchase-oriented intent.
        </p>
      ) : (
        <ul className="space-y-4">
          {analyses.map((item) => {
            const primaryLabel =
              INTENT_CATEGORY_LABELS[
                item.primary_category as IntentCategory
              ] ?? item.primary_category;

            return (
              <li
                key={item.id}
                className="border-b border-[var(--border)] py-4"
              >
                <p className="font-medium">{item.term}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Primary: {primaryLabel} · Intent: {item.intent_label} ·
                  Confidence {Number(item.confidence).toFixed(2)}
                </p>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Audience
                    </dt>
                    <dd>{item.audience || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Use case
                    </dt>
                    <dd>{item.use_case || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Service
                    </dt>
                    <dd>{item.service_label || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                      Categories
                    </dt>
                    <dd>
                      {item.categories
                        .map(
                          (c) =>
                            INTENT_CATEGORY_LABELS[c as IntentCategory] ?? c
                        )
                        .join(", ")}
                    </dd>
                  </div>
                </dl>

                {item.problem ? (
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Problem signal: {item.problem}
                  </p>
                ) : null}
                {item.outcome ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Desired outcome: {item.outcome}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
