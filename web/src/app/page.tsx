import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,_rgba(28,58,92,0.18),_transparent_50%),radial-gradient(ellipse_at_80%_100%,_rgba(61,107,90,0.12),_transparent_45%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
            Freelance
          </p>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            DeepSearch
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24 pt-10 md:px-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-[var(--foreground)] md:text-5xl">
          Research buyer intent. Find gaps. Position your gig with clarity.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
          DeepSearch helps freelancers turn marketplace signals into service
          strategy — from keyword hierarchy to opportunity gaps and gig
          positioning.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
