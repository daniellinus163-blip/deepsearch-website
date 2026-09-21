"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { classifyMany } from "@/lib/intent/engine";
import { createClient } from "@/lib/supabase/server";
import type { Keyword, ServiceDiscovery } from "@/lib/types/database";

export type IntentActionResult =
  | { ok: true; message: string; count: number }
  | { ok: false; message: string };

export async function analyzeBuyerIntentForService(
  formData: FormData
): Promise<IntentActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }

  const user = await requireUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const serviceId = String(formData.get("service_id") ?? "").trim();
  if (!serviceId) return { ok: false, message: "Missing service id." };

  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!service) return { ok: false, message: "Service not found." };

  const { data: discovery } = await supabase
    .from("service_discoveries")
    .select("*")
    .eq("service_id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const typedDiscovery = discovery as ServiceDiscovery | null;

  const { data: latestSet } = await supabase
    .from("keyword_sets")
    .select("id")
    .eq("user_id", user.id)
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
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    keywords = (keywordRows as Keyword[] | null) ?? [];
  }

  const terms =
    keywords.length > 0
      ? keywords.map((k) => k.term)
      : [
          typedDiscovery?.main_service || service.title,
          ...(typedDiscovery?.sub_services ?? []).slice(0, 8),
          ...(typedDiscovery?.use_cases ?? [])
            .slice(0, 4)
            .map(
              (useCase: string) =>
                `${typedDiscovery?.main_service || service.title} for ${useCase}`
            ),
        ].filter(Boolean);

  if (terms.length === 0) {
    return {
      ok: false,
      message: "Generate keywords or discover a service first.",
    };
  }

  const context = {
    mainService: typedDiscovery?.main_service || service.title,
    category: typedDiscovery?.category || service.category,
    subServices: typedDiscovery?.sub_services ?? [],
    buyerTypes: typedDiscovery?.buyer_types ?? [],
    useCases: typedDiscovery?.use_cases ?? [],
  };

  const classifications = classifyMany(terms as string[], context);
  const keywordByTerm = new Map(
    keywords.map((k) => [k.term.toLowerCase(), k.id])
  );

  // Replace prior analyses for this service
  await supabase
    .from("buyer_intent_analyses")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  const rows = classifications.map((c) => ({
    user_id: user.id,
    service_id: serviceId,
    keyword_id: keywordByTerm.get(c.term.toLowerCase()) ?? null,
    term: c.term,
    primary_category: c.primaryCategory,
    categories: c.categories,
    audience: c.audience,
    use_case: c.useCase,
    service_label: c.serviceLabel,
    intent_label: c.intentLabel,
    problem: c.problem,
    outcome: c.outcome,
    confidence: c.confidence,
    signals: c.signals,
  }));

  const { error } = await supabase.from("buyer_intent_analyses").insert(rows);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${serviceId}`);
  revalidatePath("/projects");

  return {
    ok: true,
    message: `Analyzed buyer intent for ${rows.length} terms.`,
    count: rows.length,
  };
}
