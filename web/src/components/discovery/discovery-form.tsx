"use client";

import { useEffect, useState, useTransition } from "react";
import {
  analyzeServiceQuery,
  buildFiverrGigFromResearch,
  buildMultiFiverrGigsFromResearch,
  saveDiscoveredService,
} from "@/app/actions/discovery";
import { DeepResearchReportView } from "@/components/discovery/deep-research-report";
import { MultiGigPanel } from "@/components/discovery/multi-gig-panel";
import { ResearchGigPanel } from "@/components/discovery/research-gig-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DiscoveryProfile } from "@/lib/discovery/catalog";
import type { ResearchGigResult } from "@/lib/gig/from-research";
import type { MultiGigResult } from "@/lib/gig/multi-from-research";
import type { DeepResearchReport, ResearchDepth } from "@/lib/research/types";

const RESEARCH_STAGES = [
  "Understanding the service…",
  "Loading marketplace preference…",
  "Problem-first Fiverr + public research…",
  "Discovering tools / platforms…",
  "Researching promising tags recursively…",
  "Gemini analyzing evidence…",
  "Building tag pool + niche clusters…",
  "Scoring observable competition signals…",
  "Preparing report…",
];

function ProfileSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Evidence insufficient — nothing generic was invented.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="border-b border-[var(--border)] py-2 text-sm text-[var(--foreground)] last:border-b-0"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DiscoveryForm() {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<ResearchDepth>("standard");
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [confidenceSummary, setConfidenceSummary] = useState<string | null>(
    null
  );
  const [gigResult, setGigResult] = useState<ResearchGigResult | null>(null);
  const [multiGigs, setMultiGigs] = useState<MultiGigResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [buildingGig, setBuildingGig] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!pending) {
      setStageIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % RESEARCH_STAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [pending]);

  function handleBuildMultiGigs() {
    if (!report) return;
    setBuildingGig(true);
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("research_report", JSON.stringify(report));
      const result = await buildMultiFiverrGigsFromResearch(formData);
      setBuildingGig(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMultiGigs(result.result);
      setGigResult(null);
    });
  }

  function handleBuildGig() {
    if (!report || !profile) return;
    setBuildingGig(true);
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("research_report", JSON.stringify(report));
      formData.set("main_service", profile.mainService);
      const result = await buildFiverrGigFromResearch(formData);
      setBuildingGig(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setGigResult(result.result);
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <form
        className="space-y-4"
        action={(formData) => {
          formData.set("research_depth", depth);
          startTransition(async () => {
            setMessage(null);
            setProfile(null);
            setReport(null);
            setConfidenceSummary(null);
            setGigResult(null);
            setMultiGigs(null);
            const result = await analyzeServiceQuery(formData);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            setProfile(result.profile);
            setReport(result.report);
            setConfidenceSummary(result.confidenceSummary);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="query">What do you want to sell?</Label>
          <Textarea
            id="query"
            name="query"
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='e.g. "Shopify checkout" or "Stripe webhook"'
            className="min-h-[120px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="research_depth">Research depth</Label>
          <select
            id="research_depth"
            name="research_depth"
            value={depth}
            onChange={(e) => setDepth(e.target.value as ResearchDepth)}
            className="flex h-10 w-full border border-[var(--border)] bg-transparent px-3 text-sm"
          >
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep (recursive tag/tool research)</option>
          </select>
          <p className="text-xs text-[var(--muted-foreground)]">
            Problem-first micro-niches: tool + problem + service. Fiverr
            evidence is public/observable only — never private ranking data.
            Prefer strong evidence over large generic tag lists.
          </p>
        </div>

        {message ? (
          <p className="text-sm text-[var(--muted-foreground)]" role="alert">
            {message}
          </p>
        ) : null}

        {pending && !buildingGig ? (
          <div className="space-y-1 border border-[var(--border)] px-3 py-3">
            <p className="text-sm text-[var(--foreground)]">
              {RESEARCH_STAGES[stageIndex]}
            </p>
          </div>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending && !buildingGig ? "Researching…" : "Run deep research"}
        </Button>
      </form>

      <div className="space-y-8">
        {!profile && !pending ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Flow: starting term → marketplace research → problems → tools → tag
            pool → niche opportunities → up to 4 gig drafts.
          </p>
        ) : null}

        {profile ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                Workspace profile (from research)
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                {profile.mainService}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Category: {profile.category}
              </p>
              {confidenceSummary ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {confidenceSummary}
                </p>
              ) : null}
            </div>

            <ProfileSection title="Sub-services" items={profile.subServices} />
            <ProfileSection
              title="Possible buyer types"
              items={profile.buyerTypes}
            />
            <ProfileSection
              title="Possible use cases"
              items={profile.useCases}
            />

            <form
              action={(formData) => {
                startTransition(async () => {
                  const result = await saveDiscoveredService(formData);
                  if (result && !result.ok) {
                    setMessage(result.message);
                  }
                });
              }}
              className="space-y-3 border-t border-[var(--border)] pt-6"
            >
              <input
                type="hidden"
                name="source_query"
                value={profile.sourceQuery}
              />
              <input
                type="hidden"
                name="main_service"
                value={profile.mainService}
              />
              <input type="hidden" name="category" value={profile.category} />
              <input
                type="hidden"
                name="matched_catalog"
                value={profile.matchedCatalog ?? ""}
              />
              {profile.subServices.map((item) => (
                <input
                  key={item}
                  type="hidden"
                  name="sub_services"
                  value={item}
                />
              ))}
              {profile.buyerTypes.map((item) => (
                <input
                  key={item}
                  type="hidden"
                  name="buyer_types"
                  value={item}
                />
              ))}
              {profile.useCases.map((item) => (
                <input key={item} type="hidden" name="use_cases" value={item} />
              ))}
              {report ? (
                <input
                  type="hidden"
                  name="research_report"
                  value={JSON.stringify(report)}
                />
              ) : null}
              {gigResult ? (
                <input
                  type="hidden"
                  name="research_gig"
                  value={JSON.stringify(gigResult)}
                />
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending && !buildingGig ? "Saving…" : "Save to my workspace"}
              </Button>
            </form>
          </div>
        ) : null}

        {report && confidenceSummary ? (
          <DeepResearchReportView
            report={report}
            confidenceSummary={confidenceSummary}
            onBuildGig={handleBuildGig}
            onBuildMultiGigs={handleBuildMultiGigs}
            buildingGig={buildingGig}
          />
        ) : null}

        {multiGigs ? <MultiGigPanel result={multiGigs} /> : null}
        {gigResult ? <ResearchGigPanel result={gigResult} /> : null}
      </div>
    </div>
  );
}
