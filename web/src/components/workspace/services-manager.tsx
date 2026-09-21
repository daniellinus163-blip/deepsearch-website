"use client";

import { useState, useTransition } from "react";
import { createService, deleteService } from "@/app/actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Service } from "@/lib/types/database";

type ServicesManagerProps = {
  services: Service[];
};

export function ServicesManager({ services }: ServicesManagerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-xl space-y-8">
      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await createService(formData);
            setMessage(result.message);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="title">Service title</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Roblox character design"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="Game art / Character design"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What you offer and who it's for"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add service"}
        </Button>
      </form>

      {message ? (
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      ) : null}

      <div className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
          Your services
        </h3>
        {services.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No services yet. Add one to start building your workspace.
          </p>
        ) : (
          <ul className="space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {service.title}
                  </p>
                  {service.category ? (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {service.category}
                    </p>
                  ) : null}
                  {service.description ? (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {service.description}
                    </p>
                  ) : null}
                </div>
                <form
                  action={(formData) => {
                    startTransition(async () => {
                      const result = await deleteService(formData);
                      setMessage(result.message);
                    });
                  }}
                >
                  <input type="hidden" name="id" value={service.id} />
                  <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
