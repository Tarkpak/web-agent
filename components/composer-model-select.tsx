"use client";

import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  ModelSelectorValue,
  type ModelOption,
} from "@/components/model-selector";
import { useOptionalShell } from "@/components/shell-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";

export function ComposerModelSelect() {
  const shell = useOptionalShell();
  const models = useMemo<ModelOption[]>(
    () =>
      shell?.models.map((model) => ({
        id: model.id,
        name: model.label,
        description: model.ownedBy || undefined,
        keywords: model.ownedBy ? [model.ownedBy, model.kind] : [model.kind],
        icon: model.kind === "image" ? <ImageIcon /> : undefined,
      })) ?? [],
    [shell?.models],
  );

  if (!shell) return null;

  const chatModelIds = new Set(
    shell.models.filter((model) => model.kind === "chat").map((model) => model.id),
  );
  const chatModels = models.filter((model) => chatModelIds.has(model.id));
  const imageModels = models.filter((model) => !chatModelIds.has(model.id));

  return (
    <ModelSelectorRoot models={models} value={shell.modelId} onValueChange={shell.setModelId}>
      <ModelSelectorTrigger
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 max-w-48 gap-1 rounded-[min(var(--radius-md),12px)] px-2 font-normal"
        aria-label="Select model"
      >
        <ModelSelectorValue
          showEffort={false}
          placeholder={shell.loading ? "Loading models" : "Select model"}
          className="gap-1.5 [&>span]:font-normal"
        />
      </ModelSelectorTrigger>
      <ModelSelectorContent searchable side="top" align="start" className="w-72">
        <ModelSelectorSearch placeholder="Filter models" />
        {shell.error ? <p className="text-destructive px-3 py-2 text-xs">{shell.error}</p> : null}
        <ModelSelectorList>
          <ModelSelectorEmpty>No models from this endpoint.</ModelSelectorEmpty>
          {chatModels.length > 0 ? (
            <ModelSelectorGroup heading="Chat / vision">
              {chatModels.map((model) => (
                <ModelSelectorItem key={model.id} model={model} />
              ))}
            </ModelSelectorGroup>
          ) : null}
          {imageModels.length > 0 ? (
            <ModelSelectorGroup heading="Image">
              {imageModels.map((model) => (
                <ModelSelectorItem key={model.id} model={model} />
              ))}
            </ModelSelectorGroup>
          ) : null}
        </ModelSelectorList>
        <div className="border-t p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start"
            disabled={shell.loading}
            onClick={() => void shell.refresh()}
          >
            <RefreshCwIcon className={cn("size-3.5", shell.loading && "animate-spin")} />
            Refresh models
          </Button>
        </div>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}
