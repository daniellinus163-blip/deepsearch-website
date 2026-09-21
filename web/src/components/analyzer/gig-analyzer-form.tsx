"use client";

import { useEffect, useState, useTransition } from "react";
import {
  analyzeFiverrGig,
  generateOptimizedGigFromAnalyzer,
  goDeeperOnGig,
  rephraseDescriptionAction,
  rephraseTitleAction,
} from "@/app/actions/analyzer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AnalyzerDeepResult,
  GigAuditReport,
  GigSnapshot,
  OptimizedGigBundle,
} from "@/lib/analyzer/types";
import type { DeepResearchReport } from "@/lib/research/types";

const DEEP_STAGES = [
  "Researching service…",
  "Researching buyer problems…",
  "Researching tools…",
  "Researching related terms…",
  "Researching relevant Fiverr listings…",
  "Analyzing buyer intent…",
  "Finding positioning opportunities…",
  "Building optimized tag clusters…",
];

const KIND_LABEL: Record<string, string> = {
  tool: "Tool",
  problem: "Problem",
  buyer_need: "Buyer need",
  style: "Style",
  service: "Service",
};

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-8 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function formatOptimized(opt: OptimizedGigBundle) {
  const packages = opt.packages
    .map(
      (p) =>
        `${p.name}\n${p.summary}\n${p.includes.map((i) => `- ${i}`).join("\n")}`
    )
    .join("\n\n");
  const faqs = opt.faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  return [
    `TITLE\n${opt.title}`,
    `TAGS\n${opt.tags.join(", ")}`,
    `DESCRIPTION\n${opt.description}`,
    `PACKAGES\n${packages}`,
    `FAQs\n${faqs}`,
    `REQUIREMENTS\n${opt.requirements.map((r) => `- ${r}`).join("\n")}`,
  ].join("\n\n");
}

export function GigAnalyzerForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<
    "idle" | "audit" | "deep" | "optimized" | "rephrase"
  >("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [rephraseMode, setRephraseMode] = useState<"title" | "description" | null>(
    null
  );

  const [snapshot, setSnapshot] = useState<GigSnapshot | null>(null);
  const [audit, setAudit] = useState<GigAuditReport | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deep, setDeep] = useState<AnalyzerDeepResult | null>(null);
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [optimized, setOptimized] = useState<OptimizedGigBundle | null>(null);

  const [workingTitle, setWorkingTitle] = useState("");
  const [workingDescription, setWorkingDescription] = useState("");

  useEffect(() => {
    if (!pending || phase !== "deep") {
      setStageIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % DEEP_STAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [pending, phase]);

  const boostTags = audit?.suggestedBoostTags ?? [];
  const allSuggestedTagText = boostTags.map((t) => t.tag).join(", ");

  return (
    <div className="space-y-10">
      <form
        className="max-w-2xl space-y-4"
        action={(formData) => {
          startTransition(async () => {
            setMessage(null);
            setPhase("idle");
            setSnapshot(null);
            setAudit(null);
            setDeep(null);
            setReport(null);
            setOptimized(null);
            const result = await analyzeFiverrGig(formData);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            setSnapshot(result.snapshot);
            setAudit(result.audit);
            setSessionId(result.sessionId);
            setWorkingTitle(result.snapshot.title || "");
            setWorkingDescription(result.snapshot.description || "");
            setPhase("audit");
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="gig_title">Gig title</Label>
          <Input
            id="gig_title"
            name="gig_title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Paste your current Fiverr gig title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gig_description">Gig description</Label>
          <Textarea
            id="gig_description"
            name="gig_description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[140px]"
            placeholder="Paste your current Fiverr gig description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gig_tags">Current tags (comma-separated)</Label>
          <Input
            id="gig_tags"
            name="gig_tags"
            required
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. stripe, webhook, payment api"
          />
        </div>

        <p className="text-xs text-[var(--muted-foreground)]">
          Paste title, description, and tags from your public gig. URL fetch is
          not used because Fiverr often blocks automated access. Analysis
          focuses on tags you can add to boost the gig under this service.
        </p>

        {message ? (
          <p className="text-sm text-[var(--muted-foreground)]" role="alert">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending && phase === "idle" ? "Analyzing…" : "Analyze Gig"}
        </Button>
      </form>

      {snapshot && audit ? (
        <section className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              Your gig
            </p>
            <p className="text-sm font-medium">{snapshot.title}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Current tags: {snapshot.tags.join(", ")}
            </p>
          </div>

          <div className="space-y-4 border-t border-[var(--border)] pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                  Tags to add (boost)
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Up to 10 short Fiverr-style tags under this service — tools,
                  problem keywords, buyer needs, or style. Add these to your
                  gig.
                </p>
              </div>
              {allSuggestedTagText ? (
                <CopyButton label="Copy all tags" text={allSuggestedTagText} />
              ) : null}
            </div>

            {boostTags.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No new boost tags found. Try a more specific title/description.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {boostTags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    className="border border-[var(--border)] bg-[var(--sidebar)] px-3 py-2 text-left transition hover:border-[var(--foreground)]"
                    title={t.why}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(t.tag);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <span className="block text-sm font-medium">{t.tag}</span>
                    <span className="block text-[10px] tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                      {KIND_LABEL[t.kind] || t.kind}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <ul className="space-y-2">
              {boostTags.map((t) => (
                <li key={`${t.tag}-why`} className="text-xs text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">
                    {t.tag}
                  </span>
                  {" — "}
                  {t.why}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 border-t border-[var(--border)] pt-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
              Rephrase with boost tags
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Rewrite your title or description into a stronger selling point
              using the suggested tags above.
            </p>

            <div className="space-y-2">
              <Label htmlFor="working_title">Gig title</Label>
              <Input
                id="working_title"
                value={workingTitle}
                onChange={(e) => setWorkingTitle(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setRephraseMode("title");
                    setPhase("rephrase");
                    setMessage(null);
                    startTransition(async () => {
                      const formData = new FormData();
                      formData.set("title", workingTitle);
                      formData.set("description", workingDescription);
                      formData.set(
                        "current_tags",
                        snapshot.tags.join(", ")
                      );
                      formData.set(
                        "boost_tags",
                        JSON.stringify(boostTags)
                      );
                      const result = await rephraseTitleAction(formData);
                      if (!result.ok) {
                        setMessage(result.message);
                        setPhase("audit");
                        return;
                      }
                      setWorkingTitle(result.text);
                      setTitle(result.text);
                      setPhase("audit");
                      setRephraseMode(null);
                    });
                  }}
                >
                  {pending && rephraseMode === "title"
                    ? "Rephrasing title…"
                    : "Rephrase title"}
                </Button>
                <CopyButton label="Copy title" text={workingTitle} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="working_description">Gig description</Label>
              <Textarea
                id="working_description"
                value={workingDescription}
                onChange={(e) => setWorkingDescription(e.target.value)}
                className="min-h-[160px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setRephraseMode("description");
                    setPhase("rephrase");
                    setMessage(null);
                    startTransition(async () => {
                      const formData = new FormData();
                      formData.set("title", workingTitle);
                      formData.set("description", workingDescription);
                      formData.set(
                        "current_tags",
                        snapshot.tags.join(", ")
                      );
                      formData.set(
                        "boost_tags",
                        JSON.stringify(boostTags)
                      );
                      const result = await rephraseDescriptionAction(formData);
                      if (!result.ok) {
                        setMessage(result.message);
                        setPhase("audit");
                        return;
                      }
                      setWorkingDescription(result.text);
                      setDescription(result.text);
                      setPhase("audit");
                      setRephraseMode(null);
                    });
                  }}
                >
                  {pending && rephraseMode === "description"
                    ? "Rephrasing description…"
                    : "Rephrase description"}
                </Button>
                <CopyButton
                  label="Copy description"
                  text={workingDescription}
                />
              </div>
            </div>
          </div>

          <details className="border-t border-[var(--border)] pt-6">
            <summary className="cursor-pointer text-sm font-medium">
              Brief audit notes
            </summary>
            <div className="mt-4 space-y-2 text-sm text-[var(--muted-foreground)]">
              <p>{audit.overview}</p>
              <p>Buyer: {audit.targetBuyer}</p>
              <p>Problem: {audit.mainProblem}</p>
              <p>Outcome: {audit.desiredOutcome}</p>
            </div>
          </details>

          <div className="border-t border-[var(--border)] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setPhase("deep");
                setMessage(null);
                startTransition(async () => {
                  const formData = new FormData();
                  formData.set(
                    "snapshot",
                    JSON.stringify({
                      ...snapshot,
                      title: workingTitle || snapshot.title,
                      description:
                        workingDescription || snapshot.description,
                    })
                  );
                  formData.set("audit", JSON.stringify(audit));
                  if (sessionId) formData.set("session_id", sessionId);
                  const result = await goDeeperOnGig(formData);
                  if (!result.ok) {
                    setMessage(result.message);
                    setPhase("audit");
                    return;
                  }
                  setDeep(result.deep);
                  setReport(result.report);
                  setPhase("deep");
                });
              }}
            >
              {pending && phase === "deep"
                ? DEEP_STAGES[stageIndex]
                : "🔎 Go Deeper in Research"}
            </Button>
          </div>
        </section>
      ) : null}

      {deep && report ? (
        <section className="space-y-6 border-t border-[var(--border)] pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            Deep Research Findings
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {deep.confidenceSummary}
          </p>

          <div className="space-y-2">
            <h3 className="text-xs font-medium tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              More tag clusters
            </h3>
            {deep.tagClusters.map((c) => (
              <div key={c.name} className="space-y-1">
                <p className="text-sm font-medium">{c.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">{c.tags.join(", ")}</p>
                  <CopyButton label="Copy" text={c.tags.join(", ")} />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setPhase("optimized");
              startTransition(async () => {
                const formData = new FormData();
                formData.set(
                  "snapshot",
                  JSON.stringify({
                    ...snapshot,
                    title: workingTitle || snapshot?.title,
                    description:
                      workingDescription || snapshot?.description,
                  })
                );
                formData.set("audit", JSON.stringify(audit));
                formData.set("deep", JSON.stringify(deep));
                formData.set("report", JSON.stringify(report));
                if (sessionId) formData.set("session_id", sessionId);
                const result = await generateOptimizedGigFromAnalyzer(formData);
                if (!result.ok) {
                  setMessage(result.message);
                  setPhase("deep");
                  return;
                }
                setOptimized(result.optimized);
                setWorkingTitle(result.optimized.title);
                setWorkingDescription(result.optimized.description);
              });
            }}
          >
            {pending && phase === "optimized"
              ? "Generating…"
              : "✨ Generate Optimized Gig"}
          </Button>
        </section>
      ) : null}

      {optimized ? (
        <section className="space-y-6 border-t border-[var(--border)] pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            Optimized Gig
          </h2>
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Copy title" text={optimized.title} />
            <CopyButton label="Copy description" text={optimized.description} />
            <CopyButton label="Copy tags" text={optimized.tags.join(", ")} />
            <CopyButton
              label="Copy full gig"
              text={formatOptimized(optimized)}
            />
          </div>
          <p className="text-sm font-medium">{optimized.title}</p>
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {optimized.description}
          </pre>
          <p className="text-sm">Tags: {optimized.tags.join(", ")}</p>
        </section>
      ) : null}
    </div>
  );
}
