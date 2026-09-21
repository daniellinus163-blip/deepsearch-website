import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { getAuthUser, getProfile, requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types/database";

export default async function DashboardPage() {
  await requireUser();

  const configured = isSupabaseConfigured();
  const user = await getAuthUser();
  const profile = await getProfile();

  let services: Service[] = [];
  let researchCount = 0;
  let opportunityCount = 0;

  if (configured && user) {
    const supabase = await createClient();
    const [servicesRes, researchRes, opportunitiesRes] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("research_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("saved_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    services = (servicesRes.data as Service[] | null) ?? [];
    researchCount = researchRes.count ?? 0;
    opportunityCount = opportunitiesRes.count ?? 0;
  }

  const name =
    profile?.freelancer_name || user?.email?.split("@")[0] || "Freelancer";

  return (
    <>
      <Header
        title="Dashboard"
        description={`Welcome back, ${name}. This is your research workspace.`}
      />
      <main className="flex-1 space-y-10 px-6 py-8 md:px-8">
        {!configured ? (
          <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
            Configure Supabase to unlock your personal workspace data.
          </p>
        ) : null}

        <section className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              Services
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
              {services.length}
            </p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              Saved research
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
              {researchCount}
            </p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              Opportunities
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
              {opportunityCount}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Your services
            </h2>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/discover">Discover</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Manage</Link>
              </Button>
            </div>
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Use Discover to turn “I want to sell…” into a structured service
              profile, then research buyer intent later.
            </p>
          ) : (
            <ul className="space-y-3">
              {services.slice(0, 5).map((service) => (
                <li
                  key={service.id}
                  className="border-b border-[var(--border)] py-3"
                >
                  <p className="font-medium">{service.title}</p>
                  {service.category ? (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {service.category}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Profile snapshot
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Marketplaces:{" "}
            {profile?.marketplaces?.length
              ? profile.marketplaces.join(", ")
              : "None selected yet"}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Skills:{" "}
            {profile?.skills?.length
              ? profile.skills.join(", ")
              : "Add skills in Settings"}
          </p>
        </section>
      </main>
    </>
  );
}
