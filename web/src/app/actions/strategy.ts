"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { buildCompetitionReport } from "@/lib/competition/engine";
import { isSupabaseConfigured } from "@/lib/env";
import { classifyBuyerIntent } from "@/lib/intent/engine";
import type { IntentClassification } from "@/lib/intent/types";
import { findOpportunityGaps } from "@/lib/opportunity/engine";
import { analyzeRootNeed } from "@/lib/root-need/engine";
import { createClient } from "@/lib/supabase/server";
import type {
  BuyerIntentAnalysis,
  Keyword,
  MarketplaceListing,
  ServiceDiscovery,
} from "@/lib/types/database";

export type StrategyActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function loadServiceContext(serviceId: string, userId: string) {
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!service) return null;

  const { data: discovery } = await supabase
    .from("service_discoveries")
    .select("*")
    .eq("service_id", serviceId)
    .eq("user_id", userId)
    .maybeSingle();

  const typedDiscovery = discovery as ServiceDiscovery | null;

  const { data: latestSet } = await supabase
    .from("keyword_sets")
    .select("id")
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let keywords: Keyword[] = [];
  if (latestSet?.id) {
    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("*")
      .eq("keyword_set_id", latestSet.id)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    keywords = (keywordRows as Keyword[] | null) ?? [];
  }

  const { data: intentRows } = await supabase
    .from("buyer_intent_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("service_id", serviceId);

  const intents = (intentRows as BuyerIntentAnalysis[] | null) ?? [];

  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("user_id", userId)
    .order("extracted_at", { ascending: false })
    .limit(100);

  return {
    supabase,
    service,
    discovery: typedDiscovery,
    keywords,
    intents,
    listings: (listings as MarketplaceListing[] | null) ?? [],
  };
}

export async function runRootNeedAnalysis(
  formData: FormData
): Promise<StrategyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "");
  const ctx = await loadServiceContext(serviceId, user.id);
  if (!ctx) return { ok: false, message: "Service not found." };

  const terms =
    ctx.keywords.length > 0
      ? ctx.keywords.map((k) => k.term)
      : [ctx.discovery?.main_service || ctx.service.title];

  const intentByTerm = new Map(
    ctx.intents.map((i) => [i.term.toLowerCase(), i])
  );
  const keywordByTerm = new Map(
    ctx.keywords.map((k) => [k.term.toLowerCase(), k.id])
  );

  await ctx.supabase
    .from("root_need_analyses")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  const rows = terms.map((term) => {
    const stored = intentByTerm.get(term.toLowerCase());
    const intent: IntentClassification | null = stored
      ? {
          term: stored.term,
          primaryCategory: stored.primary_category as IntentClassification["primaryCategory"],
          categories: stored.categories as IntentClassification["categories"],
          audience: stored.audience,
          useCase: stored.use_case,
          serviceLabel: stored.service_label,
          intentLabel: stored.intent_label,
          problem: stored.problem,
          outcome: stored.outcome,
          confidence: Number(stored.confidence),
          signals: (stored.signals as string[]) ?? [],
        }
      : classifyBuyerIntent(term, {
          mainService: ctx.discovery?.main_service || ctx.service.title,
          buyerTypes: ctx.discovery?.buyer_types ?? [],
          useCases: ctx.discovery?.use_cases ?? [],
        });

    const root = analyzeRootNeed(
      term,
      intent,
      ctx.discovery?.main_service || ctx.service.title
    );

    return {
      user_id: user.id,
      service_id: serviceId,
      keyword_id: keywordByTerm.get(term.toLowerCase()) ?? null,
      intent_analysis_id: stored?.id ?? null,
      term: root.term,
      buyer_intent: root.buyerIntent,
      buyer_problem: root.buyerProblem,
      root_need: root.rootNeed,
      desired_outcome: root.desiredOutcome,
      what_text: root.what,
      why_text: root.why,
      where_text: root.where,
      who_text: root.who,
    };
  });

  const { error } = await ctx.supabase.from("root_need_analyses").insert(rows);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${serviceId}`);
  return { ok: true, message: `Mapped root needs for ${rows.length} terms.` };
}

export async function runCompetitionAnalysis(
  formData: FormData
): Promise<StrategyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "");
  const ctx = await loadServiceContext(serviceId, user.id);
  if (!ctx) return { ok: false, message: "Service not found." };

  const demandTerms = [
    ...ctx.keywords.map((k) => k.term),
    ...(ctx.discovery?.sub_services ?? []),
    ...(ctx.discovery?.buyer_types ?? []),
  ];

  const report = buildCompetitionReport(ctx.listings, demandTerms);

  await ctx.supabase
    .from("competition_reports")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  const { error } = await ctx.supabase.from("competition_reports").insert({
    user_id: user.id,
    service_id: serviceId,
    listings_analyzed: report.listingsAnalyzed,
    common_positioning: report.commonPositioning,
    common_price_min: report.commonPriceMin,
    common_price_max: report.commonPriceMax,
    common_price_avg: report.commonPriceAvg,
    currency: report.currency,
    common_delivery: report.commonDelivery,
    repeated_buyer_language: report.repeatedBuyerLanguage,
    missing_positioning: report.missingPositioning,
    competition_signal: report.competitionSignal,
    summary: report.summary,
    raw_metrics: report.rawMetrics,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${serviceId}`);
  return {
    ok: true,
    message: `Competition report ready (${report.listingsAnalyzed} listings).`,
  };
}

export async function runOpportunityGapAnalysis(
  formData: FormData
): Promise<StrategyActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "");
  const ctx = await loadServiceContext(serviceId, user.id);
  if (!ctx) return { ok: false, message: "Service not found." };

  if (ctx.keywords.length === 0) {
    return {
      ok: false,
      message: "Generate keywords first, then find opportunity gaps.",
    };
  }

  const demandTerms = ctx.keywords.map((k) => k.term);
  const competition = buildCompetitionReport(ctx.listings, demandTerms);

  // Persist latest competition snapshot too
  await ctx.supabase
    .from("competition_reports")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  await ctx.supabase.from("competition_reports").insert({
    user_id: user.id,
    service_id: serviceId,
    listings_analyzed: competition.listingsAnalyzed,
    common_positioning: competition.commonPositioning,
    common_price_min: competition.commonPriceMin,
    common_price_max: competition.commonPriceMax,
    common_price_avg: competition.commonPriceAvg,
    currency: competition.currency,
    common_delivery: competition.commonDelivery,
    repeated_buyer_language: competition.repeatedBuyerLanguage,
    missing_positioning: competition.missingPositioning,
    competition_signal: competition.competitionSignal,
    summary: competition.summary,
    raw_metrics: competition.rawMetrics,
  });

  const intents: IntentClassification[] = ctx.intents.map((stored) => ({
    term: stored.term,
    primaryCategory:
      stored.primary_category as IntentClassification["primaryCategory"],
    categories: stored.categories as IntentClassification["categories"],
    audience: stored.audience,
    useCase: stored.use_case,
    serviceLabel: stored.service_label,
    intentLabel: stored.intent_label,
    problem: stored.problem,
    outcome: stored.outcome,
    confidence: Number(stored.confidence),
    signals: (stored.signals as string[]) ?? [],
  }));

  const gaps = findOpportunityGaps({
    keywords: ctx.keywords,
    intents,
    competition,
    mainService: ctx.discovery?.main_service || ctx.service.title,
  });

  // Replace prior opportunities for this service
  await ctx.supabase
    .from("saved_opportunities")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  if (gaps.length > 0) {
    const { error } = await ctx.supabase.from("saved_opportunities").insert(
      gaps.map((gap) => ({
        user_id: user.id,
        service_id: serviceId,
        title: gap.title,
        summary: gap.summary,
        marketplace: gap.marketplace,
        buyer_intent: gap.buyerIntent,
        competition_signal: gap.competitionSignal,
        specificity: gap.specificity,
        service_fit: gap.serviceFit,
        demand_signal: gap.demandSignal,
        why_identified: gap.whyIdentified,
        gap_score: gap.gapScore,
      }))
    );
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/projects/${serviceId}`);
  revalidatePath("/opportunities");
  return {
    ok: true,
    message:
      gaps.length > 0
        ? `Found ${gaps.length} opportunity gaps.`
        : "No strong gaps yet — add listings or regenerate keywords.",
  };
}
