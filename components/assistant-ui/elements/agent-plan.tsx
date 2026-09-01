"use client";

import type { ComponentProps } from "react";
import { CheckIcon, CircleIcon, LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export function AgentPlan({
  steps,
  activeIndex,
  className,
  ...props
}: ComponentProps<"div"> & { steps: readonly string[]; activeIndex: number }) {
  const active = Number.isFinite(activeIndex)
    ? Math.min(steps.length, Math.max(0, Math.floor(activeIndex)))
    : 0;
  const percent = steps.length === 0 ? 0 : (active / steps.length) * 100;
  return (
    <div
      data-slot="agent-plan"
      className={cn(paper, "w-full rounded-lg p-3", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">Plan</span>
        <span className={cn(mono, "text-foreground/45")}>
          {active} of {steps.length}
        </span>
      </div>
      <div className="bg-foreground/[0.06] mt-2.5 h-1 overflow-hidden rounded-full">
        <div
          className="bg-foreground/55 h-full rounded-full transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const done = index < active || active === steps.length;
          const current = index === active && active < steps.length;
          return (
            <li
              key={`${index}-${step}`}
              className={cn(
                "flex items-start gap-2 text-xs leading-5",
                done ? "text-foreground/45" : current ? "text-foreground/85" : "text-foreground/35",
              )}
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                {done ? (
                  <CheckIcon className="size-3.5 text-emerald-600" />
                ) : current ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                ) : (
                  <CircleIcon className="size-2" />
                )}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
