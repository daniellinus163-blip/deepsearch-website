"use client";

import { useState, useTransition } from "react";
import { generateKeywordsForService } from "@/app/actions/keywords";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, type KeywordLevel } from "@/lib/keywords/types";
import type { Keyword } from "@/lib/types/database";

const LEVEL_ORDER: KeywordLevel[] = [
  "core",
  "primary",
  "secondary",
  "long_tail",
  "buyer_intent",
];

function formatScore(value: number) {
  return value.toFixed(2);
}

type KeywordHierarchyProps = {
  serviceId: string;
  keywords: Keyword[];
};

export function KeywordHierarchy({ serviceId, keywords }: KeywordHierarchyProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = LEVEL_ORDER.map((level) => ({
    level,
    items: keywords.filter((k) => k.level === level),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Keyword hierarchy
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Core → Primary → Secondary → Long-tail → Buyer-intent. Scores are
            DeepSearch heuristics, not official marketplace rankings.
          </p>
        </div>
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await generateKeywordsForService(formData);
              setMessage(result.message);
            });
          }}
        >
          <input type="hidden" name="service_id" value={serviceId} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending
              ? "Generating…"
              : keywords.length
                ? "Regenerate keywords"
                : "Generate keywords"}
          </Button>
        </form>
      </div>

      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      {grouped.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No keywords yet. Generate a hierarchy from this service’s discovery
          profile and any saved listing tags.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group, index) => (
            <section key={group.level} className="space-y-3">
              <div className="flex items-baseline gap-2">
                {index > 0 ? (
                  <span className="text-xs text-[var(--muted-foreground)]">↓</span>
                ) : null}
                <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                  {LEVEL_LABELS[group.level]}
                </h3>
              </div>
              <ul className="space-y-3">
                {group.items.map((keyword) => (
                  <li
                    key={keyword.id}
                    className="border-b border-[var(--border)] py-3"
                  >
                    <p className="font-medium">{keyword.term}</p>
                    {keyword.parent_term ? (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        from: {keyword.parent_term}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                      <span>relevance {formatScore(Number(keyword.relevance))}</span>
                      <span>
                        specificity {formatScore(Number(keyword.specificity))}
                      </span>
                      <span>
                        competition signal{" "}
                        {formatScore(Number(keyword.competition_signal))}
                      </span>
                      <span>intent: {keyword.buyer_intent}</span>
                      <span>relation: {keyword.relationship_to_service}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
