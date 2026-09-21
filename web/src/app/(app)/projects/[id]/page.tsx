import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { KeywordHierarchy } from "@/components/keywords/keyword-hierarchy";
import { BuyerIntentPanel } from "@/components/intent/buyer-intent-panel";
import { StrategyPanels } from "@/components/strategy/strategy-panels";
import { ListingPanels } from "@/components/listing/listing-panels";
import { Button } from "@/components/ui/button";
import { getAuthUser, requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  BuyerIntentAnalysis,
  CompetitionReport,
  GigDraft,
  GigHealthReport,
  Keyword,
  RootNeedAnalysis,
  SavedOpportunity,
  Service,
  ServiceDiscovery,
  ServicePositioning,
} from "@/lib/types/database";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const user = await getAuthUser();
  if (!user) notFound();

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!service) notFound();

  const typedService = service as Service;

  const { data: discovery } = await supabase
    .from("service_discoveries")
    .select("*")
    .eq("service_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const typedDiscovery = discovery as ServiceDiscovery | null;

  const { data: latestSet } = await supabase
    .from("keyword_sets")
    .select("id")
    .eq("user_id", user.id)
    .eq("service_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let keywords: Keyword[] = [];
  if (latestSet?.id) {
    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("*")
      .eq("keyword_set_id", latestSet.id)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    keywords = (keywordRows as Keyword[] | null) ?? [];
  }

  const { data: intentRows } = await supabase
    .from("buyer_intent_analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("service_id", id)
    .order("confidence", { ascending: false });

  const intentAnalyses = (intentRows as BuyerIntentAnalysis[] | null) ?? [];

  const [{ data: rootNeedRows }, { data: competitionRow }, { data: opportunityRows }] =
    await Promise.all([
      supabase
        .from("root_need_analyses")
        .select("*")
        .eq("user_id", user.id)
        .eq("service_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("competition_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("service_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("saved_opportunities")
        .select("*")
        .eq("user_id", user.id)
        .eq("service_id", id)
        .order("gap_score", { ascending: false }),
    ]);

  const rootNeeds = (rootNeedRows as RootNeedAnalysis[] | null) ?? [];
  const competition = (competitionRow as CompetitionReport | null) ?? null;
  const opportunities = (opportunityRows as SavedOpportunity[] | null) ?? [];

  const [
    { data: positioningRow },
    { data: gigDraftRow },
    { data: healthRow },
  ] = await Promise.all([
    supabase
      .from("service_positionings")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_id", id)
      .maybeSingle(),
    supabase
      .from("gig_drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_id", id)
      .maybeSingle(),
    supabase
      .from("gig_health_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const positioning = (positioningRow as ServicePositioning | null) ?? null;
  const gigDraft = (gigDraftRow as GigDraft | null) ?? null;
  const healthReport = (healthRow as GigHealthReport | null) ?? null;

  return (
    <>
      <Header
        title={typedService.title}
        description={typedService.category ?? "Service project"}
      />
      <main className="flex-1 space-y-12 px-6 py-8 md:px-8">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">Back to projects</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/discover">Discover another</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/research">Research</Link>
          </Button>
        </div>

        {typedService.description ? (
          <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
            {typedService.description}
          </p>
        ) : null}

        {typedDiscovery ? (
          <div className="max-w-2xl space-y-8">
            <section className="space-y-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
                Discovery profile
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                From: “{typedDiscovery.source_query}”
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                Sub-services
              </h3>
              <ul className="space-y-1.5">
                {typedDiscovery.sub_services.map((item) => (
                  <li
                    key={item}
                    className="border-b border-[var(--border)] py-2 text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                Buyer types
              </h3>
              <ul className="space-y-1.5">
                {typedDiscovery.buyer_types.map((item) => (
                  <li
                    key={item}
                    className="border-b border-[var(--border)] py-2 text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                Use cases
              </h3>
              <ul className="space-y-1.5">
                {typedDiscovery.use_cases.map((item) => (
                  <li
                    key={item}
                    className="border-b border-[var(--border)] py-2 text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
            This service has no discovery profile yet. Use Discover to generate
            one from a new “I want to sell…” statement.
          </p>
        )}

        <KeywordHierarchy serviceId={id} keywords={keywords} />
        <BuyerIntentPanel serviceId={id} analyses={intentAnalyses} />
        <StrategyPanels
          serviceId={id}
          rootNeeds={rootNeeds}
          competition={competition}
          opportunities={opportunities}
        />
        <ListingPanels
          serviceId={id}
          positioning={positioning}
          gigDraft={gigDraft}
          healthReport={healthReport}
        />
      </main>
    </>
  );
}
