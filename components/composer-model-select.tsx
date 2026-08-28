"use client";

import { useOptionalShell } from "@/components/shell-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ImageIcon, RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";

export function ComposerModelSelect() {
  const shell = useOptionalShell();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!shell) return [];
    const q = query.trim().toLowerCase();
    return shell.models.filter((model) => {
      if (!q) return true;
      return (
        model.id.toLowerCase().includes(q) ||
        model.label.toLowerCase().includes(q) ||
        model.ownedBy.toLowerCase().includes(q)
      );
    });
  }, [query, shell]);

  if (!shell) return null;

  const chatModels = filtered.filter((model) => model.kind === "chat");
  const imageModels = filtered.filter((model) => model.kind === "image");
  const current =
    shell.models.find((model) => model.id === shell.modelId)?.label ??
    shell.modelId ??
    (shell.loading ? "Loading models" : "Select model");

  return (
    <div className="relative min-w-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground max-w-48 justify-between gap-1 px-2 font-normal"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Model ${current}`}
        aria-expanded={open}
      >
        <span className="truncate">{current}</span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </Button>
      {open ? (
        <div className="border-border bg-popover text-popover-foreground absolute bottom-9 left-0 z-40 w-72 rounded-xl border p-2 shadow-lg">
          <div className="mb-2 flex items-center gap-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter models"
              className="h-7"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh models"
              onClick={() => void shell.refresh()}
            >
              <RefreshCwIcon className={cn("size-3.5", shell.loading && "animate-spin")} />
            </Button>
          </div>
          {shell.error ? <p className="text-destructive px-1 py-2 text-xs">{shell.error}</p> : null}
          <div className="max-h-64 overflow-auto">
            <ModelGroup
              title="Chat / vision"
              models={chatModels}
              selected={shell.modelId}
              onSelect={(id) => {
                shell.setModelId(id);
                setOpen(false);
                setQuery("");
              }}
            />
            <ModelGroup
              title="Image"
              models={imageModels}
              selected={shell.modelId}
              onSelect={(id) => {
                shell.setModelId(id);
                setOpen(false);
                setQuery("");
              }}
              icon
            />
            {!shell.loading && filtered.length === 0 ? (
              <p className="text-muted-foreground px-1 py-2 text-xs">
                No models from this endpoint.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModelGroup({
  title,
  models,
  selected,
  onSelect,
  icon,
}: {
  title: string;
  models: { id: string; label: string; ownedBy: string }[];
  selected: string;
  onSelect: (id: string) => void;
  icon?: boolean;
}) {
  if (models.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="text-muted-foreground px-1 py-1 text-[10px] font-medium tracking-wide uppercase">
        {title}
      </p>
      {models.map((model) => (
        <button
          key={model.id}
          type="button"
          className={cn(
            "hover:bg-accent flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs",
            model.id === selected && "bg-accent",
          )}
          onClick={() => onSelect(model.id)}
        >
          {icon ? <ImageIcon className="size-3 shrink-0" /> : null}
          <span className="min-w-0 flex-1 truncate">{model.label}</span>
          {model.ownedBy ? (
            <span className="text-muted-foreground shrink-0 text-[10px]">{model.ownedBy}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
