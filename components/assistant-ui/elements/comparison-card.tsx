"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export type ComparisonOption = {
  id: string;
  name: string;
  headline: string;
  traits: readonly (string | false)[];
};

export function ComparisonCard({
  traitLabels,
  options,
  recommendedId,
  reason,
}: {
  traitLabels: readonly string[];
  options: readonly ComparisonOption[];
  recommendedId: string;
  reason: string;
}) {
  return (
    <div className={cn(paper, "my-3 rounded-lg p-3")}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const recommended = option.id === recommendedId;
          return (
            <div
              key={option.id}
              className={cn(
                field,
                "rounded-md border p-3",
                recommended ? "border-emerald-500/40" : "border-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{option.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{option.headline}</p>
                </div>
                {recommended && (
                  <span className={cn(mono, "text-emerald-600 uppercase")}>Pick</span>
                )}
              </div>
              <div className="mt-3 grid gap-1.5">
                {traitLabels.map((label, index) => {
                  const value = option.traits[index];
                  return (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      {value ? (
                        <CheckIcon className="size-3.5 text-emerald-600" />
                      ) : (
                        <MinusIcon className="text-muted-foreground size-3.5" />
                      )}
                      <span className={value ? undefined : "text-muted-foreground"}>
                        {value || label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-5">{reason}</p>
    </div>
  );
}
