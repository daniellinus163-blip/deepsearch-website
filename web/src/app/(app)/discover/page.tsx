import { Header } from "@/components/layout/header";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { requireUser } from "@/lib/auth";

export default async function DiscoverPage() {
  await requireUser();

  return (
    <>
      <Header
        title="Discover"
        description="Deep research (Fiverr when selected) → buyer needs → positioning → build gig."
      />
      <main className="flex-1 px-6 py-8 md:px-8">
        <DiscoveryForm />
      </main>
    </>
  );
}
