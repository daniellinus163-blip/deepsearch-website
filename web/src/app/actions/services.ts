"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import type { ActionResult } from "@/app/actions/profile";

export async function createService(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Configure Supabase in .env.local before adding services.",
    };
  }

  const user = await requireUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!title) {
    return { ok: false, message: "Service title is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    user_id: user.id,
    title,
    description,
    category,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, message: "Service added." };
}

export async function deleteService(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Configure Supabase first." };
  }

  const user = await requireUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false, message: "Missing service id." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, message: "Service removed." };
}
