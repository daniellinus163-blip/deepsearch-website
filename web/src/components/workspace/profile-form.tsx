"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MARKETPLACES, type Profile } from "@/lib/types/database";
import { joinList } from "@/lib/utils/lists";

type ProfileFormProps = {
  profile: Profile | null;
  email?: string | null;
};

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(
    profile?.marketplaces ?? []
  );

  function toggleMarketplace(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  return (
    <form
      className="max-w-xl space-y-5"
      action={(formData) => {
        startTransition(async () => {
          selected.forEach((marketplace) =>
            formData.append("marketplaces", marketplace)
          );
          const result = await updateProfile(formData);
          setMessage(result.message);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="freelancer_name">Freelancer name</Label>
        <Input
          id="freelancer_name"
          name="freelancer_name"
          required
          defaultValue={profile?.freelancer_name ?? ""}
          placeholder="Your display name"
        />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email ?? profile?.email ?? ""} disabled readOnly />
      </div>

      <div className="space-y-2">
        <Label>Marketplaces</Label>
        <div className="flex flex-wrap gap-3">
          {MARKETPLACES.map((marketplace) => {
            const checked = selected.includes(marketplace);
            return (
              <label
                key={marketplace}
                className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMarketplace(marketplace)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {marketplace}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills</Label>
        <Textarea
          id="skills"
          name="skills"
          defaultValue={joinList(profile?.skills)}
          placeholder="Roblox modeling, character design, UGC…"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Separate skills with commas.
        </p>
      </div>

      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
