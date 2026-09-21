import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { requireUser, getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types/database";

export default async function ProjectsPage() {
  await requireUser();

  const configured = isSupabaseConfigured();
  const user = await getAuthUser();
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
        title="Projects"
        description="Services and launch work tied to your workspace."
      />
      <main className="flex-1 space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Discover a service profile, then research and optimize it later.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/discover">Discover service</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">Manual add</Link>
            </Button>
          </div>
        </div>

        {services.length === 0 ? (
          <p className="max-w-xl text-[var(--muted-foreground)]">
            No projects yet. Start with Discover — for example, “I want to sell
            Roblox character design”.
          </p>
        ) : (
          <ul className="max-w-2xl space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="border-b border-[var(--border)] py-3"
              >
                <Link
                  href={`/projects/${service.id}`}
                  className="block hover:opacity-80"
                >
                  <p className="font-medium">{service.title}</p>
                  {service.category ? (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {service.category}
                    </p>
                  ) : null}
                  {service.description ? (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {service.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
