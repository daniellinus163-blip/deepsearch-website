"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("your-project")) {
      setMessage(
        "Add your Supabase keys to web/.env.local (see .env.example), then restart the dev server."
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = nextPath;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              freelancer_name: freelancerName.trim() || undefined,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          window.location.href = nextPath;
          return;
        }

        setMessage(
          "Account created. Check your email to confirm, then sign in."
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 block text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
          Freelance
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          DeepSearch
        </p>
      </Link>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" ? (
          <div className="space-y-2">
            <Label htmlFor="freelancer_name">Freelancer name</Label>
            <Input
              id="freelancer_name"
              type="text"
              autoComplete="name"
              value={freelancerName}
              onChange={(e) => setFreelancerName(e.target.value)}
              placeholder="How you want to appear"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message ? (
          <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-6 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        onClick={() =>
          setMode((current) => (current === "signin" ? "signup" : "signin"))
        }
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,58,92,0.12),_transparent_55%)]" />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
