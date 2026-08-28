"use client";

import type { ProviderEnvHints } from "@/hooks/use-provider-settings";
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
import { SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ProviderSettingsButton({
  settings,
  hints,
  onSave,
}: {
  settings: ProviderSettings;
  hints: ProviderEnvHints;
  onSave: (next: ProviderSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const envKeyReady =
    draft.provider === "xai" ? hints.hasXaiKey : hints.hasOpenAIKey;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Provider settings" />
        }
      >
        <SettingsIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provider</DialogTitle>
          <DialogDescription>
            Point this shell at OpenAI, an OpenAI-compatible proxy, or native
            xAI. Models are loaded from the endpoint. Leave the API key empty to
            use `.env.local`.
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
          <label className="grid gap-1 text-xs">
            Supplier
            <select
              value={draft.provider}
              onChange={(event) => {
                const provider =
                  event.target.value === "xai" ? "xai" : "openai";
                setDraft({
                  ...draft,
                  provider,
                  model: "",
                  baseURL:
                    provider === "openai"
                      ? draft.baseURL || hints.defaultBaseURL
                      : "",
                });
              }}
              className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            >
              <option value="openai">OpenAI compatible</option>
              <option value="xai">xAI (Grok tools)</option>
            </select>
          </label>

          {draft.provider === "openai" ? (
            <label className="grid gap-1 text-xs">
              Base URL
              <Input
                value={draft.baseURL}
                onChange={(event) =>
                  setDraft({ ...draft, baseURL: event.target.value })
                }
                placeholder={
                  hints.defaultBaseURL || "https://api.openai.com/v1"
                }
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-xs">
            API key
            <Input
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              onChange={(event) =>
                setDraft({ ...draft, apiKey: event.target.value })
              }
              placeholder={
                envKeyReady
                  ? "Using key from .env.local"
                  : "sk-... or leave empty to use env"
              }
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
