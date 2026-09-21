"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser, requireUser } from "@/lib/auth";
import { tryCatalogMatch } from "@/lib/discovery/engine";
import type { DiscoveryProfile } from "@/lib/discovery/catalog";
import { isSupabaseConfigured } from "@/lib/env";
import {
  buildGigFromResearch,
  type ResearchGigResult,
} from "@/lib/gig/from-research";
import {
  buildMultiGigsFromResearch,
  type MultiGigResult,
} from "@/lib/gig/multi-from-research";
import {
  reportConfidenceSummary,
  runDeepResearch,
} from "@/lib/research/orchestrator";
import type { DeepResearchReport, ResearchDepth } from "@/lib/research/types";
import { createClient } from "@/lib/supabase/server";

export type DiscoveryActionResult =
  | {
      ok: true;
      profile: DiscoveryProfile;
      report: DeepResearchReport;
      confidenceSummary: string;
      mode: "deep_research";
    }
  | { ok: false; message: string };

export type BuildGigActionResult =
  | { ok: true; result: ResearchGigResult }
  | { ok: false; message: string };

export type BuildMultiGigActionResult =
  | { ok: true; result: MultiGigResult }
  | { ok: false; message: string };

async function loadUserMarketplaces(userId: string | undefined | null) {
  if (!userId || !isSupabaseConfigured()) return [] as string[];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("marketplaces")
      .eq("id", userId)
      .maybeSingle();
    return (data?.marketplaces as string[] | null) ?? [];
  } catch {
    return [];
  }
}

/**
 * Deep research entry — researches before recommending.
 * When profile has Fiverr selected, Fiverr marketplace adapter is included.
 */
export async function analyzeServiceQuery(
  formData: FormData
): Promise<DiscoveryActionResult> {
  const query = String(formData.get("query") ?? "").trim();
  const depthRaw = String(formData.get("research_depth") ?? "standard")
    .trim()
    .toLowerCase();
  const researchDepth: ResearchDepth =
    depthRaw === "quick" || depthRaw === "deep" ? depthRaw : "standard";

  if (!query) {
    return { ok: false, message: "Enter what you want to sell." };
  }

  try {
    const user = await getAuthUser();
    const marketplaces = await loadUserMarketplaces(user?.id);

    const { report, profile } = await runDeepResearch({
      query,
      userId: user?.id ?? null,
      marketplaces,
      researchDepth,
    });

    const catalog = tryCatalogMatch(query);
    if (catalog.profile && catalog.bestScore >= 70) {
      profile.matchedCatalog = catalog.profile.matchedCatalog;
      profile.category = catalog.profile.category;
      // Prefer researched mainService when it is deeper than bare catalog title
      if (
        !profile.mainService ||
        profile.mainService.toLowerCase() === query.toLowerCase()
      ) {
        profile.mainService = catalog.profile.mainService;
      }
      const merged = new Set([
        ...catalog.profile.subServices,
        ...profile.subServices,
      ]);
      profile.subServices = [...merged].slice(0, 10);
      profile.buyerTypes = [
        ...new Set([
          ...catalog.profile.buyerTypes,
          ...profile.buyerTypes,
        ]),
      ].slice(0, 8);
      profile.useCases = [
        ...new Set([...catalog.profile.useCases, ...profile.useCases]),
      ].slice(0, 8);
    }

    if (isSupabaseConfigured() && user) {
      try {
        const supabase = await createClient();
        await supabase.from("deep_research_reports").insert({
          user_id: user.id,
          source_query: query,
          core_service: report.coreService,
          report,
          evidence_count: report.evidence.length,
          confidence_summary: reportConfidenceSummary(report),
          marketplaces: report.marketplaces,
          research_depth: report.researchDepth,
        });
      } catch {
        // Non-fatal
      }
    }

    return {
      ok: true,
      profile,
      report,
      confidenceSummary: reportConfidenceSummary(report),
      mode: "deep_research",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Deep research failed.",
    };
  }
}

/**
 * Turn completed research into up to 4 distinct micro-niche Fiverr gigs.
 */
export async function buildMultiFiverrGigsFromResearch(
  formData: FormData
): Promise<BuildMultiGigActionResult> {
  const reportJson = String(formData.get("research_report") ?? "").trim();
  if (!reportJson) {
    return { ok: false, message: "Run deep research before building gigs." };
  }

  try {
    const report = JSON.parse(reportJson) as DeepResearchReport;
    if (!report?.query) {
      return { ok: false, message: "Research report is incomplete." };
    }
    if (!report.marketplaces?.length) {
      const user = await getAuthUser();
      report.marketplaces = await loadUserMarketplaces(user?.id);
    }
    if (
      report.marketplaces.length &&
      !report.marketplaces.some((m) => /fiverr/i.test(m))
    ) {
      return {
        ok: false,
        message:
          "Select Fiverr in Settings → Marketplaces to build Fiverr-style gigs.",
      };
    }
    if (!report.marketplaces.length) {
      report.marketplaces = ["Fiverr"];
    }
    if (!report.microNiches?.length) {
      return {
        ok: false,
        message:
          "No micro-niches found yet. Try Deep research depth or a more technical starting term.",
      };
    }

    const result = await buildMultiGigsFromResearch(report);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not build gigs from research.",
    };
  }
}

/**
 * Turn completed research into a Fiverr-style gig (Gemini + research trace).
 */
export async function buildFiverrGigFromResearch(
  formData: FormData
): Promise<BuildGigActionResult> {
  const reportJson = String(formData.get("research_report") ?? "").trim();
  const mainService = String(formData.get("main_service") ?? "").trim();
  if (!reportJson) {
    return { ok: false, message: "Run deep research before building a gig." };
  }

  try {
    const report = JSON.parse(reportJson) as DeepResearchReport;
    if (!report?.query) {
      return { ok: false, message: "Research report is incomplete." };
    }

    // Ensure marketplace context for gig writing
    if (!report.marketplaces?.length) {
      const user = await getAuthUser();
      report.marketplaces = await loadUserMarketplaces(user?.id);
    }
    if (
      report.marketplaces.length &&
      !report.marketplaces.some((m) => /fiverr/i.test(m))
    ) {
      return {
        ok: false,
        message:
          "Select Fiverr in Settings → Marketplaces to build a Fiverr-style gig.",
      };
    }
    if (!report.marketplaces.length) {
      report.marketplaces = ["Fiverr"];
    }

    const result = await buildGigFromResearch(report, mainService || undefined);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not build gig from research.",
    };
  }
}

export async function saveDiscoveredService(
  formData: FormData
): Promise<{ ok: false; message: string } | void> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Configure Supabase before saving a discovered service.",
    };
  }

  const user = await requireUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const sourceQuery = String(formData.get("source_query") ?? "").trim();
  const mainService = String(formData.get("main_service") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const matchedCatalog =
    String(formData.get("matched_catalog") ?? "").trim() || null;
  const subServices = formData
    .getAll("sub_services")
    .map(String)
    .filter(Boolean);
  const buyerTypes = formData.getAll("buyer_types").map(String).filter(Boolean);
  const useCases = formData.getAll("use_cases").map(String).filter(Boolean);
  const reportJson = String(formData.get("research_report") ?? "").trim();
  const gigJson = String(formData.get("research_gig") ?? "").trim();

  if (!sourceQuery || !mainService || !category) {
    return { ok: false, message: "Discovery profile is incomplete." };
  }

  const supabase = await createClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .insert({
      user_id: user.id,
      title: mainService,
      category,
      description: `Deep researched from: "${sourceQuery}"`,
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    return {
      ok: false,
      message: serviceError?.message ?? "Could not create service.",
    };
  }

  const { error: discoveryError } = await supabase
    .from("service_discoveries")
    .insert({
      user_id: user.id,
      service_id: service.id,
      source_query: sourceQuery,
      main_service: mainService,
      category,
      sub_services: subServices,
      buyer_types: buyerTypes,
      use_cases: useCases,
      matched_catalog: matchedCatalog,
    });

  if (discoveryError) {
    await supabase.from("services").delete().eq("id", service.id);
    return { ok: false, message: discoveryError.message };
  }

  let researchReportId: string | null = null;
  if (reportJson) {
    try {
      const report = JSON.parse(reportJson) as DeepResearchReport;
      const { data: inserted } = await supabase
        .from("deep_research_reports")
        .insert({
          user_id: user.id,
          service_id: service.id,
          source_query: sourceQuery,
          core_service: mainService,
          report,
          evidence_count: report.evidence?.length ?? 0,
          confidence_summary: reportConfidenceSummary(report),
          marketplaces: report.marketplaces ?? [],
        })
        .select("id")
        .single();
      researchReportId = inserted?.id ?? null;
    } catch {
      // ignore
    }
  }

  if (gigJson) {
    try {
      const packed = JSON.parse(gigJson) as ResearchGigResult;
      await supabase.from("gig_drafts").upsert(
        {
          user_id: user.id,
          service_id: service.id,
          title: packed.gig.title,
          title_why: packed.gig.titleWhy,
          tags: packed.gig.tags,
          tags_why: packed.gig.tagsWhy,
          description: packed.gig.description,
          description_why: packed.gig.descriptionWhy,
          packages: packed.gig.packages,
          packages_why: packed.gig.packagesWhy,
          faqs: packed.gig.faqs,
          faqs_why: packed.gig.faqsWhy,
          requirements: packed.gig.requirements,
          requirements_why: packed.gig.requirementsWhy,
          delivery_structure: packed.gig.deliveryStructure,
          delivery_why: packed.gig.deliveryWhy,
          buyer_positioning: packed.gig.buyerPositioning,
          research_report_id: researchReportId,
          research_trace: packed.researchTrace,
          marketplace:
            packed.researchTrace.marketplaces.find((m) => /fiverr/i.test(m)) ||
            packed.researchTrace.marketplaces[0] ||
            "Fiverr",
        },
        { onConflict: "user_id,service_id" }
      );
    } catch {
      // ignore
    }
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/discover");
  redirect(`/projects/${service.id}`);
}
