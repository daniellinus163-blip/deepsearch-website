import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { requireUser, getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SavedOpportunity } from "@/lib/types/database";

export default async function OpportunitiesPage() {
  await requireUser();

  const configured = isSupabaseConfigured();
  const user = await getAuthUser();
  let opportunities: SavedOpportunity[] = [];

  if (configured && user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("saved_opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("gap_score", { ascending: false });
    opportunities = (data as SavedOpportunity[] | null) ?? [];
  }

  return (
    <>
      <Header
        title="Opportunities"
        description="Opportunity gaps from demand signals vs competitor positioning."
      />
      <main className="flex-1 space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
            Run “Find opportunity gaps” on a project after keywords (and ideally
            marketplace listings) are ready.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">Open projects</Link>
          </Button>
        </div>

        {opportunities.length === 0 ? (
          <p className="max-w-xl text-[var(--muted-foreground)]">
            No saved opportunities yet.
          </p>
        ) : (
          <ul className="max-w-3xl space-y-4">
            {opportunities.map((item) => (
              <li
                key={item.id}
                className="border-b border-[var(--border)] py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.service_id ? (
                    <Link
                      href={`/projects/${item.service_id}`}
                      className="text-xs text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      View project
                    </Link>
                  ) : null}
                </div>
                {item.summary ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {item.summary}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {[
                    item.marketplace,
                    item.buyer_intent && `Intent ${item.buyer_intent}`,
                    item.competition_signal &&
                      `Competition ${item.competition_signal}`,
                    item.specificity && `Specificity ${item.specificity}`,
                    item.service_fit && `Fit ${item.service_fit}`,
                    item.gap_score != null &&
                      `Score ${Number(item.gap_score).toFixed(2)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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
      </main>
    </>
  );
}
