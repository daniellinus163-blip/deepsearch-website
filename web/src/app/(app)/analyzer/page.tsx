import { Header } from "@/components/layout/header";
import { GigAnalyzerForm } from "@/components/analyzer/gig-analyzer-form";
import { requireUser } from "@/lib/auth";

export default async function AnalyzerPage() {
  await requireUser();

  return (
    <>
      <Header
        title="Gig Analyzer"
        description="Paste your gig title, description, and tags to get boost tags and stronger selling copy."
      />
      <main className="flex-1 px-6 py-8 md:px-8">
        <GigAnalyzerForm />
      </main>
    </>
  );
}
