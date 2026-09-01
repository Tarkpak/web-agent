"use client";

import {
  ModelSelectorContent,
  ModelSelectorEffort,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  ModelSelectorValue,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import { useOptionalShell } from "@/components/shell-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, RefreshCwIcon } from "lucide-react";
import { useAui } from "@assistant-ui/react";
import { supportsReasoningEffort, type ReasoningEffort } from "@/lib/provider";
import { useEffect, useMemo } from "react";

export function ComposerModelSelect() {
  const shell = useOptionalShell();
  const aui = useAui();
  const models = useMemo<ModelOption[]>(
    () =>
      shell?.models.map((model) => ({
        id: model.id,
        name: model.label,
        description: model.ownedBy || undefined,
        keywords: model.ownedBy ? [model.ownedBy, model.kind] : [model.kind],
        icon: model.kind === "image" ? <ImageIcon /> : undefined,
        efforts:
          model.kind === "chat" && shell && supportsReasoningEffort(shell.provider, model.id)
            ? true
            : undefined,
      })) ?? [],
    [shell],
  );

  const modelId = shell?.modelId;
  const reasoningEffort = shell?.reasoningEffort;
  const activeReasoningEffort =
    shell && modelId && supportsReasoningEffort(shell.provider, modelId)
      ? reasoningEffort
      : undefined;
  useEffect(() => {
    if (!modelId) return;
    return aui.modelContext.register({
      getModelContext: () => ({
        config: {
          modelName: modelId,
          reasoningEffort: activeReasoningEffort,
        },
      }),
    });
  }, [activeReasoningEffort, aui, modelId]);

  if (!shell) return null;

  const chatModelIds = new Set(
    shell.models.filter((model) => model.kind === "chat").map((model) => model.id),
  );
  const chatModels = models.filter((model) => chatModelIds.has(model.id));
  const imageModels = models.filter((model) => !chatModelIds.has(model.id));

  return (
    <ModelSelectorRoot
      models={models}
      value={shell.modelId}
      onValueChange={shell.setModelId}
      effort={shell.reasoningEffort}
      onEffortChange={(effort) => shell.setReasoningEffort(effort as ReasoningEffort)}
    >
      <ModelSelectorTrigger
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 max-w-48 gap-1 rounded-[min(var(--radius-md),12px)] px-2 font-normal"
        aria-label="Select model"
      >
        <ModelSelectorValue
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
        <ModelSelectorEffort />
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
