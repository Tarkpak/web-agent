"use client";

import { CheckIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";
import { useState } from "react";

export type VisualDirection = {
  id: string;
  name: string;
  mood: string;
  rationale: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  secondary: string;
  narrativeMode?: string;
  narrativeBehavior?: string;
  visualStyle?: string;
  visualBehavior?: string;
  imageStrategy?: string;
  compositionRule?: string;
  typographyRule?: string;
  recurringMotif?: string;
  recommended?: boolean;
};

export function RecommendationChoices({
  detail,
  options,
  onSelect,
  onCustom,
}: {
  detail: string;
  options: readonly VisualDirection[];
  onSelect: (option: VisualDirection) => void;
  onCustom?: (direction: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customDirection, setCustomDirection] = useState("");
  return (
    <div className={cn(paper, "my-3 overflow-hidden rounded-lg")}>
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="text-primary size-4" />
          Choose a look
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-5">{detail}</p>
      </div>
      <div className="grid gap-2 p-3 lg:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option)}
            className="hover:border-foreground/30 overflow-hidden rounded-md border text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div
              className="relative aspect-[16/7] overflow-hidden p-3"
              style={{ backgroundColor: option.background, color: option.foreground }}
            >
              <div className="h-1 w-10" style={{ backgroundColor: option.accent }} />
              <div className="mt-5 max-w-[80%] text-base leading-tight font-semibold">
                {option.name}
              </div>
              <div className="absolute right-3 bottom-3 flex gap-1">
                {[option.foreground, option.muted, option.accent, option.secondary].map(
                  (color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="size-3 rounded-full outline outline-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ),
                )}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{option.name}</span>
                {option.recommended && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckIcon className="size-3" /> Best fit
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-1 text-[10px]">
                {option.narrativeMode ? (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5">{option.narrativeMode}</span>
                ) : null}
                {option.visualStyle ? (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5">{option.visualStyle}</span>
                ) : null}
                {option.imageStrategy ? (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5">{option.imageStrategy}</span>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1.5 text-[11px]">{option.mood}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5">{option.rationale}</p>
              {option.recurringMotif ? (
                <p className="text-muted-foreground mt-2 line-clamp-2 border-t pt-2 text-[11px] leading-4">
                  Motif: {option.recurringMotif}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      {onCustom ? (
        <div className="border-t p-3">
          {customOpen ? (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (customDirection.trim()) onCustom(customDirection.trim());
              }}
            >
              <input
                value={customDirection}
                onChange={(event) => setCustomDirection(event.target.value)}
                placeholder="Describe another direction, reference, or feeling..."
                aria-label="Custom presentation direction"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/30 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
              <button
                type="submit"
                disabled={!customDirection.trim()}
                className="bg-primary text-primary-foreground focus-visible:ring-ring/40 rounded-md px-3 py-2 text-sm font-medium transition-transform outline-none active:scale-[0.96] disabled:opacity-40 focus-visible:ring-2"
              >
                Use direction
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              <PlusIcon className="size-4" /> Describe another direction
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
