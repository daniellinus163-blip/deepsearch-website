"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { splitList } from "@/lib/utils/lists";
import { MARKETPLACES } from "@/lib/types/database";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Configure Supabase in .env.local before saving your profile.",
    };
  }

  const user = await requireUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const freelancerName = String(formData.get("freelancer_name") ?? "").trim();
  const skills = splitList(String(formData.get("skills") ?? ""));
  const marketplaces = formData
    .getAll("marketplaces")
    .map(String)
    .filter((value) =>
      (MARKETPLACES as readonly string[]).includes(value)
    );

  if (!freelancerName) {
    return { ok: false, message: "Freelancer name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      freelancer_name: freelancerName,
      skills,
      marketplaces,
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile saved." };
}
