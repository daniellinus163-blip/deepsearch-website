import { Header } from "@/components/layout/header";
import { ProfileForm } from "@/components/workspace/profile-form";
import { ServicesManager } from "@/components/workspace/services-manager";
import { getAuthUser, getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Service } from "@/lib/types/database";

export default async function SettingsPage() {
  await requireUser();

  const configured = isSupabaseConfigured();
  const user = await getAuthUser();
  const profile = await getProfile();

  let services: Service[] = [];
  if (configured && user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    services = (data as Service[] | null) ?? [];
  }

  return (
    <>
      <Header
        title="Settings"
        description="Profile, marketplace preferences, and services."
      />
      <main className="flex-1 space-y-12 px-6 py-8 md:px-8">
        {!configured ? (
          <p className="max-w-xl text-sm text-[var(--muted-foreground)]">
            Add your Supabase URL and anon key to{" "}
            <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs">
              web/.env.local
            </code>
            , run the Phase 2 SQL migration, then restart the dev server.
          </p>
        ) : null}

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Profile
          </h2>
          <ProfileForm profile={profile} email={user?.email} />
        </section>

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Services
          </h2>
          <ServicesManager services={services} />
        </section>
      </main>
    </>
  );
}
