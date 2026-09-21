import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  reportConfidenceSummary,
  runDeepResearch,
} from "@/lib/research/orchestrator";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side deep research endpoint.
 * Secrets (GEMINI_API_KEY, etc.) never leave the server.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      marketplaces?: string[];
    };
    const query = String(body.query ?? "").trim();
    if (!query) {
      return NextResponse.json(
        { ok: false, message: "Enter what you want to sell." },
        { status: 400 }
      );
    }

    const user = await getAuthUser();
    let marketplaces = Array.isArray(body.marketplaces)
      ? body.marketplaces.map(String)
      : [];

    if (!marketplaces.length && user && isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("profiles")
          .select("marketplaces")
          .eq("id", user.id)
          .maybeSingle();
        marketplaces = (data?.marketplaces as string[] | null) ?? [];
      } catch {
        marketplaces = [];
      }
    }

    const { report, profile } = await runDeepResearch({
      query,
      userId: user?.id ?? null,
      marketplaces,
    });

    return NextResponse.json({
      ok: true,
      profile,
      report,
      confidenceSummary: reportConfidenceSummary(report),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Deep research failed.",
      },
      { status: 500 }
    );
  }
}
