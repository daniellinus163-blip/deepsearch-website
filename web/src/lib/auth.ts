import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/types/database";

export async function getAuthUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getAuthUser();

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  // Fallback if trigger hasn't run yet
  const { data: created } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      freelancer_name:
        (user.user_metadata?.freelancer_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null,
    })
    .select("*")
    .single();

  return (created as Profile | null) ?? null;
}
