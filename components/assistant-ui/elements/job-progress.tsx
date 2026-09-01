"use client";

import type { ComponentProps } from "react";
import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export type JobStage = { name: string; weight: number };

export function JobProgress({
  title,
  stages,
  stageIndex,
  stageProgress,
  eta,
  className,
  ...props
}: ComponentProps<"div"> & {
  title: string;
  stages: readonly JobStage[];
  stageIndex: number;
  stageProgress: number;
  eta: string;
}) {
  const current = Number.isFinite(stageIndex)
    ? Math.min(stages.length, Math.max(0, Math.floor(stageIndex)))
    : 0;
  const progress = Math.min(1, Math.max(0, stageProgress));
  const totalWeight = stages.reduce((sum, stage) => sum + Math.max(0, stage.weight), 0) || 1;
  const completedWeight = stages
    .slice(0, current)
    .reduce((sum, stage) => sum + Math.max(0, stage.weight), 0);
  const activeWeight =
    current < stages.length ? Math.max(0, stages[current]?.weight ?? 0) * progress : 0;
  const percent =
    current >= stages.length ? 100 : ((completedWeight + activeWeight) / totalWeight) * 100;
  const done = current >= stages.length;

  return (
    <div
      data-slot="job-progress"
      className={cn(paper, "my-2 w-full max-w-md rounded-lg p-3", className)}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckIcon className="size-3.5 text-emerald-600" />
        ) : (
          <LoaderCircleIcon className="text-foreground/45 size-3.5 animate-spin" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
        <span className={cn(mono, "text-foreground/45")}>{done ? "done" : eta}</span>
      </div>
      <div className="bg-foreground/[0.06] mt-3 h-1 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            done ? "bg-emerald-500" : "bg-foreground/55",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex min-w-0 gap-3 overflow-hidden">
        {stages.map((stage, index) => (
          <span
            key={`${stage.name}-${index}`}
            className={cn(
              mono,
              "truncate",
              index === current && !done
                ? "text-foreground/75"
                : index < current || done
                  ? "text-foreground/40"
                  : "text-foreground/25",
            )}
          >
            {stage.name}
          </span>
        ))}
      </div>
    </div>
  );
}
