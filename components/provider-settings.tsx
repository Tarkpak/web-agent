"use client";

import type { ProviderSettings } from "@/lib/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

const PROVIDERS = [
  { label: "OpenAI compatible", value: "openai" },
  { label: "xAI (Grok tools)", value: "xai" },
];

export function ProviderSettingsButton({
  settings,
  onSave,
}: {
  settings: ProviderSettings;
  onSave: (next: ProviderSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const supplierLabelId = useId();

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Provider settings" />}>
        <SettingsIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provider</DialogTitle>
          <DialogDescription>
            Point this shell at OpenAI, an OpenAI-compatible proxy, or native xAI. Models are loaded
            from the endpoint. Everything you enter here is saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              ...draft,
              baseURL: draft.baseURL.trim(),
              apiKey: draft.apiKey.trim(),
              model: settings.model,
            });
            setOpen(false);
          }}
        >
          <div className="grid gap-1 text-xs">
            <span id={supplierLabelId}>Supplier</span>
            <Select
              items={PROVIDERS}
              value={draft.provider}
              onValueChange={(value) => {
                const provider = value === "xai" ? "xai" : "openai";
                setDraft({
                  ...draft,
                  provider,
                  model: "",
                  baseURL: draft.baseURL,
                });
              }}
            >
              <SelectTrigger className="w-full" aria-labelledby={supplierLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {draft.provider === "openai" ? (
            <label className="grid gap-1 text-xs">
              Base URL
              <Input
                value={draft.baseURL}
                onChange={(event) => setDraft({ ...draft, baseURL: event.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-xs">
            API key
            <Input
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>

          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
