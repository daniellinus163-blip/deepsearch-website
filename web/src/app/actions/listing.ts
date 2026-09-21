"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { buildGigDraft } from "@/lib/gig/builder";
import { analyzeGigHealth } from "@/lib/gig/health";
import { buildServicePositioning } from "@/lib/positioning/engine";
import { createClient } from "@/lib/supabase/server";
import type {
  Keyword,
  RootNeedAnalysis,
  SavedOpportunity,
  ServiceDiscovery,
  ServicePositioning,
} from "@/lib/types/database";
import { splitList } from "@/lib/utils/lists";

export type ListingActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function loadListingContext(serviceId: string, userId: string) {
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
    const { data: rows } = await supabase
      .from("keywords")
      .select("*")
      .eq("keyword_set_id", latestSet.id)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    keywords = (rows as Keyword[] | null) ?? [];
  }

  const { data: rootNeeds } = await supabase
    .from("root_need_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .limit(5);

  const { data: opportunities } = await supabase
    .from("saved_opportunities")
    .select("*")
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .order("gap_score", { ascending: false })
    .limit(3);

  const { data: positioning } = await supabase
    .from("service_positionings")
    .select("*")
    .eq("user_id", userId)
    .eq("service_id", serviceId)
    .maybeSingle();

  return {
    supabase,
    service,
    discovery: discovery as ServiceDiscovery | null,
    keywords,
    rootNeeds: (rootNeeds as RootNeedAnalysis[] | null) ?? [],
    opportunities: (opportunities as SavedOpportunity[] | null) ?? [],
    positioning: (positioning as ServicePositioning | null) ?? null,
  };
}

export async function generatePositioning(
  formData: FormData
): Promise<ListingActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "");
  const ctx = await loadListingContext(serviceId, user.id);
  if (!ctx) return { ok: false, message: "Service not found." };

  const topRoot = ctx.rootNeeds[0];
  const topOpp = ctx.opportunities[0];
  const draft = buildServicePositioning({
    mainService: ctx.discovery?.main_service || ctx.service.title,
    targetBuyer: topRoot?.who_text || ctx.discovery?.buyer_types?.[0],
    problem: topRoot?.buyer_problem,
    desiredResult: topRoot?.desired_outcome,
    differentiatorHints: [
      ...(ctx.discovery?.sub_services ?? []).slice(0, 2),
      ...(topOpp ? [topOpp.title] : []),
    ],
    opportunityTitle: topOpp?.title,
  });

  const { error } = await ctx.supabase.from("service_positionings").upsert(
    {
      user_id: user.id,
      service_id: serviceId,
      target_buyer: draft.targetBuyer,
      problem: draft.problem,
      desired_result: draft.desiredResult,
      service_offer: draft.serviceOffer,
      differentiator: draft.differentiator,
      positioning_statement: draft.positioningStatement,
    },
    { onConflict: "user_id,service_id" }
  );

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${serviceId}`);
  return { ok: true, message: "Positioning generated." };
}

export async function generateGigDraft(
  formData: FormData
): Promise<ListingActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "");
  const ctx = await loadListingContext(serviceId, user.id);
  if (!ctx) return { ok: false, message: "Service not found." };

  let positioning = ctx.positioning
    ? {
        targetBuyer: ctx.positioning.target_buyer,
        problem: ctx.positioning.problem,
        desiredResult: ctx.positioning.desired_result,
        serviceOffer: ctx.positioning.service_offer,
        differentiator: ctx.positioning.differentiator,
        positioningStatement: ctx.positioning.positioning_statement,
      }
    : null;

  if (!positioning) {
    const topRoot = ctx.rootNeeds[0];
    const topOpp = ctx.opportunities[0];
    positioning = buildServicePositioning({
      mainService: ctx.discovery?.main_service || ctx.service.title,
      targetBuyer: topRoot?.who_text || ctx.discovery?.buyer_types?.[0],
      problem: topRoot?.buyer_problem,
      desiredResult: topRoot?.desired_outcome,
      differentiatorHints: ctx.discovery?.sub_services ?? [],
      opportunityTitle: topOpp?.title,
    });
  }

  const draft = buildGigDraft({
    mainService: ctx.discovery?.main_service || ctx.service.title,
    positioning,
    keywords: ctx.keywords.map((k) => k.term),
    subServices: ctx.discovery?.sub_services ?? [],
    opportunityTitle: ctx.opportunities[0]?.title,
  });

  const { error } = await ctx.supabase.from("gig_drafts").upsert(
    {
      user_id: user.id,
      service_id: serviceId,
      title: draft.title,
      title_why: draft.titleWhy,
      tags: draft.tags,
      tags_why: draft.tagsWhy,
      description: draft.description,
      description_why: draft.descriptionWhy,
      packages: draft.packages,
      packages_why: draft.packagesWhy,
      faqs: draft.faqs,
      faqs_why: draft.faqsWhy,
      requirements: draft.requirements,
      requirements_why: draft.requirementsWhy,
      delivery_structure: draft.deliveryStructure,
      delivery_why: draft.deliveryWhy,
      buyer_positioning: draft.buyerPositioning,
    },
    { onConflict: "user_id,service_id" }
  );

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${serviceId}`);
  return { ok: true, message: "Gig draft generated with WHY notes." };
}

export async function analyzeExistingGig(
  formData: FormData
): Promise<ListingActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const tags = splitList(String(formData.get("tags") ?? ""));
  const packagesText = String(formData.get("packages") ?? "");
  const faqText = String(formData.get("faq") ?? "");

  if (!title && !description && tags.length === 0) {
    return { ok: false, message: "Paste at least a title, description, or tags." };
  }

  const supabase = await createClient();
  let expectedService: string | null = null;
  let expectedKeywords: string[] = [];

  if (serviceId) {
    const ctx = await loadListingContext(serviceId, user.id);
    if (ctx) {
      expectedService = ctx.discovery?.main_service || ctx.service.title;
      expectedKeywords = ctx.keywords.map((k) => k.term);
    }
  }

  const findings = analyzeGigHealth({
    title,
    description,
    tags,
    packagesText,
    faqText,
    expectedService,
    expectedKeywords,
  });

  const { error } = await supabase.from("gig_health_reports").insert({
    user_id: user.id,
    service_id: serviceId,
    source_title: title || null,
    source_description: description || null,
    source_tags: tags,
    source_packages: packagesText || null,
    source_faq: faqText || null,
    findings,
  });

  if (error) return { ok: false, message: error.message };

  if (serviceId) revalidatePath(`/projects/${serviceId}`);
  revalidatePath("/projects");
  return {
    ok: true,
    message: `Gig health check complete — ${findings.length} specific findings.`,
  };
}
