"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { buildKeywordHierarchy } from "@/lib/keywords/engine";
import { createClient } from "@/lib/supabase/server";
import type { ServiceDiscovery } from "@/lib/types/database";

export type KeywordActionResult =
  | { ok: true; message: string; keywordSetId: string; count: number }
  | { ok: false; message: string };

export async function generateKeywordsForService(
  formData: FormData
): Promise<KeywordActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }

  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "").trim();
  if (!serviceId) return { ok: false, message: "Missing service id." };

  const supabase = await createClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (serviceError || !service) {
    return { ok: false, message: "Service not found." };
  }

  const { data: discovery } = await supabase
    .from("service_discoveries")
    .select("*")
    .eq("service_id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const typedDiscovery = discovery as ServiceDiscovery | null;

  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("tags")
    .eq("user_id", user.id)
    .limit(20);

  const listingTags = [
    ...new Set(
      ((listings as Array<{ tags: string[] } | null> | null) ?? [])
        .flatMap((row) => row?.tags ?? [])
        .filter(Boolean)
    ),
  ].slice(0, 12);

  const drafts = buildKeywordHierarchy({
    mainService: typedDiscovery?.main_service || service.title,
    category: typedDiscovery?.category || service.category,
    subServices: typedDiscovery?.sub_services ?? [],
    buyerTypes: typedDiscovery?.buyer_types ?? [],
    useCases: typedDiscovery?.use_cases ?? [],
    listingTags,
    matchedCatalog: typedDiscovery?.matched_catalog ?? null,
  });

  if (drafts.length === 0) {
    return { ok: false, message: "Could not build a keyword hierarchy." };
  }

  // Replace prior keyword sets for this service (keep latest intelligence)
  const { data: existingSets } = await supabase
    .from("keyword_sets")
    .select("id")
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  const existingIds = (existingSets ?? []).map((row) => row.id);
  if (existingIds.length > 0) {
    await supabase.from("keyword_sets").delete().in("id", existingIds);
  }

  const sourceText =
    typedDiscovery?.source_query ||
    typedDiscovery?.main_service ||
    service.title;

  const { data: keywordSet, error: setError } = await supabase
    .from("keyword_sets")
    .insert({
      user_id: user.id,
      service_id: serviceId,
      source_text: sourceText,
    })
    .select("id")
    .single();

  if (setError || !keywordSet) {
    return {
      ok: false,
      message: setError?.message ?? "Could not create keyword set.",
    };
  }

  const rows = drafts.map((draft) => ({
    keyword_set_id: keywordSet.id,
    user_id: user.id,
    term: draft.term,
    level: draft.level,
    parent_term: draft.parentTerm,
    relevance: draft.relevance,
    specificity: draft.specificity,
    competition_signal: draft.competitionSignal,
    buyer_intent: draft.buyerIntent,
    relationship_to_service: draft.relationshipToService,
    sort_order: draft.sortOrder,
  }));

  const { error: keywordsError } = await supabase.from("keywords").insert(rows);
  if (keywordsError) {
    await supabase.from("keyword_sets").delete().eq("id", keywordSet.id);
    return { ok: false, message: keywordsError.message };
  }

  revalidatePath(`/projects/${serviceId}`);
  revalidatePath("/projects");
  revalidatePath("/research");

  return {
    ok: true,
    message: `Generated ${drafts.length} keywords across the hierarchy.`,
    keywordSetId: keywordSet.id,
    count: drafts.length,
  };
}
