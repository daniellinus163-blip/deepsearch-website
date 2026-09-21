import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { requireUser, getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  MarketplaceListing,
  ResearchSession,
} from "@/lib/types/database";

export default async function ResearchPage() {
  await requireUser();

  const configured = isSupabaseConfigured();
  const user = await getAuthUser();
  let sessions: ResearchSession[] = [];
  let listings: MarketplaceListing[] = [];

  if (configured && user) {
    const supabase = await createClient();
    const [sessionsRes, listingsRes] = await Promise.all([
      supabase
        .from("research_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketplace_listings")
        .select("*")
        .eq("user_id", user.id)
        .order("extracted_at", { ascending: false })
        .limit(40),
    ]);
    sessions = (sessionsRes.data as ResearchSession[] | null) ?? [];
    listings = (listingsRes.data as MarketplaceListing[] | null) ?? [];
  }

  return (
    <>
      <Header
        title="Research"
        description="Observable marketplace listings captured by the DeepSearch extension."
      />
      <main className="flex-1 space-y-10 px-6 py-8 md:px-8">
        <section className="max-w-2xl space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            How to capture listings
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
            <li>
              Load the unpacked extension from the{" "}
              <code className="rounded bg-[var(--muted)] px-1 text-xs">
                extension/
              </code>{" "}
              folder
            </li>
            <li>Open a public Fiverr gig or search page</li>
            <li>Sign in inside the extension popup (same account as the web app)</li>
            <li>Extract listing → Save to workspace</li>
          </ol>
          <p className="text-xs text-[var(--muted-foreground)]">
            DeepSearch only stores publicly visible page fields — not private
            ranking or search algorithms.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Saved listings
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">View projects</Link>
            </Button>
          </div>

          {listings.length === 0 ? (
            <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
              No marketplace listings saved yet. Use the Chrome extension on a
              Fiverr page to capture observable data.
            </p>
          ) : (
            <ul className="max-w-3xl space-y-3">
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  className="border-b border-[var(--border)] py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {listing.title || "Untitled listing"}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {listing.marketplace} · {listing.page_type}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {[
                      listing.category,
                      listing.price_text,
                      listing.seller_name,
                      listing.delivery_time,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {listing.tags?.length ? (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Tags: {listing.tags.slice(0, 8).join(", ")}
                    </p>
                  ) : null}
                  <a
                    href={listing.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-[var(--primary)] underline-offset-2 hover:underline"
                  >
                    Open source page
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Research sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
              Sessions are created automatically when you save a listing from
              the extension.
            </p>
          ) : (
            <ul className="max-w-2xl space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="border-b border-[var(--border)] py-3"
                >
                  <p className="font-medium">{session.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {session.status}
                    {session.query ? ` · ${session.query}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
