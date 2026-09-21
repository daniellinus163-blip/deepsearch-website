import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getAuthUser, getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

type HeaderProps = {
  title: string;
  description?: string;
};

export async function Header({ title, description }: HeaderProps) {
  const configured = isSupabaseConfigured();
  const user = configured ? await getAuthUser() : null;
  const profile = user ? await getProfile() : null;
  const label =
    profile?.freelancer_name || user?.email?.split("@")[0] || "Account";

  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5 md:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
              {label}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
