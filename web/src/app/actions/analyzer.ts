"use server";

import { getAuthUser } from "@/lib/auth";
import { auditGigSnapshot } from "@/lib/analyzer/audit";
import { collectGigFromPaste } from "@/lib/analyzer/collect";
import { goDeeperFromGig } from "@/lib/analyzer/go-deeper";
import { generateOptimizedGig } from "@/lib/analyzer/optimize";
import {
  rephraseGigDescription,
  rephraseGigTitle,
} from "@/lib/analyzer/rephrase";
import type { BoostTag } from "@/lib/analyzer/suggest-tags";
import type {
  AnalyzerDeepResult,
  GigAuditReport,
  GigSnapshot,
  OptimizedGigBundle,
} from "@/lib/analyzer/types";
import { isSupabaseConfigured } from "@/lib/env";
import type { DeepResearchReport } from "@/lib/research/types";
import { createClient } from "@/lib/supabase/server";

export type AnalyzeGigResult =
  | {
      ok: true;
      snapshot: GigSnapshot;
      audit: GigAuditReport;
      sessionId: string | null;
    }
  | { ok: false; message: string };

export type GoDeeperResult =
  | {
      ok: true;
      deep: AnalyzerDeepResult;
      report: DeepResearchReport;
    }
  | { ok: false; message: string };

export type OptimizeGigResult =
  | { ok: true; optimized: OptimizedGigBundle }
  | { ok: false; message: string };

export type RephraseResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; message: string };

async function loadMarketplaces(userId: string | null | undefined) {
  if (!userId || !isSupabaseConfigured()) return ["Fiverr"];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("marketplaces")
      .eq("id", userId)
      .maybeSingle();
    const list = (data?.marketplaces as string[] | null) ?? [];
    return list.length ? list : ["Fiverr"];
  } catch {
    return ["Fiverr"];
  }
}

function parseTags(raw: string): string[] {
  return raw
    .split(/,|\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function analyzeFiverrGig(
  formData: FormData
): Promise<AnalyzeGigResult> {
  const title = String(formData.get("gig_title") ?? "").trim();
  const description = String(formData.get("gig_description") ?? "").trim();
  const tags = parseTags(String(formData.get("gig_tags") ?? ""));

  if (!title) return { ok: false, message: "Gig title is required." };
  if (!description) {
    return { ok: false, message: "Gig description is required." };
  }
  if (tags.length === 0) {
    return { ok: false, message: "Current gig tags are required." };
  }

  try {
    const user = await getAuthUser();
    const snapshot = await collectGigFromPaste({ title, description, tags });
    const audit = await auditGigSnapshot(snapshot);

    let sessionId: string | null = null;
    if (user && isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("gig_analyzer_sessions")
          .insert({
            user_id: user.id,
            source_url: snapshot.sourceUrl,
            snapshot,
            audit,
            status: "audited",
          })
          .select("id")
          .single();
        sessionId = data?.id ?? null;
      } catch {
        // Non-fatal if table not ready
      }
    }

    return { ok: true, snapshot, audit, sessionId };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Gig analysis failed.",
    };
  }
}

export async function rephraseTitleAction(
  formData: FormData
): Promise<RephraseResult> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currentTags = parseTags(String(formData.get("current_tags") ?? ""));
  let boostTags: BoostTag[] = [];
  try {
    boostTags = JSON.parse(String(formData.get("boost_tags") ?? "[]")) as BoostTag[];
  } catch {
    boostTags = [];
  }

  if (!title) return { ok: false, message: "Title is required to rephrase." };

  try {
    const result = await rephraseGigTitle({
      title,
      description,
      currentTags,
      boostTags,
    });
    return { ok: true, text: result.title, provider: result.provider };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not rephrase title.",
    };
  }
}

export async function rephraseDescriptionAction(
  formData: FormData
): Promise<RephraseResult> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currentTags = parseTags(String(formData.get("current_tags") ?? ""));
  let boostTags: BoostTag[] = [];
  try {
    boostTags = JSON.parse(String(formData.get("boost_tags") ?? "[]")) as BoostTag[];
  } catch {
    boostTags = [];
  }

  if (!description) {
    return { ok: false, message: "Description is required to rephrase." };
  }

  try {
    const result = await rephraseGigDescription({
      title,
      description,
      currentTags,
      boostTags,
    });
    return {
      ok: true,
      text: result.description,
      provider: result.provider,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not rephrase description.",
    };
  }
}

export async function goDeeperOnGig(
  formData: FormData
): Promise<GoDeeperResult> {
  const snapshotJson = String(formData.get("snapshot") ?? "").trim();
  const auditJson = String(formData.get("audit") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "").trim() || null;

  if (!snapshotJson || !auditJson) {
    return { ok: false, message: "Run Analyze Gig before Go Deeper." };
  }

  try {
    const snapshot = JSON.parse(snapshotJson) as GigSnapshot;
    const audit = JSON.parse(auditJson) as GigAuditReport;
    const user = await getAuthUser();
    const marketplaces = await loadMarketplaces(user?.id);

    const { result, report } = await goDeeperFromGig({
      snapshot,
      audit,
      userId: user?.id ?? null,
      marketplaces,
    });

    if (user && isSupabaseConfigured() && sessionId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("gig_analyzer_sessions")
          .update({
            status: "deep_researched",
            deep_result: result,
            deep_report: report,
            research_query: result.researchQuery,
          })
          .eq("id", sessionId)
          .eq("user_id", user.id);
      } catch {
        // non-fatal
      }
    }

    return { ok: true, deep: result, report };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Go Deeper research failed.",
    };
  }
}

export async function generateOptimizedGigFromAnalyzer(
  formData: FormData
): Promise<OptimizeGigResult> {
  const snapshotJson = String(formData.get("snapshot") ?? "").trim();
  const auditJson = String(formData.get("audit") ?? "").trim();
  const deepJson = String(formData.get("deep") ?? "").trim();
  const reportJson = String(formData.get("report") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "").trim() || null;

  if (!snapshotJson || !auditJson || !deepJson || !reportJson) {
    return {
      ok: false,
      message: "Complete Go Deeper research before generating an optimized gig.",
    };
  }

  try {
    const snapshot = JSON.parse(snapshotJson) as GigSnapshot;
    const audit = JSON.parse(auditJson) as GigAuditReport;
    const deep = JSON.parse(deepJson) as AnalyzerDeepResult;
    const report = JSON.parse(reportJson) as DeepResearchReport;

    const optimized = await generateOptimizedGig({
      snapshot,
      audit,
      deep,
      report,
    });

    const user = await getAuthUser();
    if (user && isSupabaseConfigured() && sessionId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("gig_analyzer_sessions")
          .update({
            status: "optimized",
            optimized_gig: optimized,
          })
          .eq("id", sessionId)
          .eq("user_id", user.id);
      } catch {
        // non-fatal
      }
    }

    return { ok: true, optimized };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not generate optimized gig.",
    };
  }
}
