"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

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
  recommended?: boolean;
};

export function RecommendationChoices({
  detail,
  options,
  onSelect,
}: {
  detail: string;
  options: readonly VisualDirection[];
  onSelect: (option: VisualDirection) => void;
}) {
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
              <p className="text-muted-foreground mt-1 text-[11px]">{option.mood}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5">{option.rationale}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
