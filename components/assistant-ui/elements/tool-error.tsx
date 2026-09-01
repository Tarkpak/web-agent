"use client";

import type { ComponentProps } from "react";
import { AlertCircleIcon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export function ToolError({
  name,
  target,
  message,
  onRetry,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  name: string;
  target: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      data-slot="tool-error"
      className={cn(paper, "my-2 flex w-full max-w-sm flex-col gap-3 rounded-2xl p-3.5", className)}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircleIcon className="size-3.5 shrink-0 text-red-500" />
        <span className={cn(mono, "text-foreground/55 shrink-0")}>{name}</span>
        <span className="text-foreground/80 min-w-0 flex-1 truncate text-[13px]">{target}</span>
      </div>
      <div
        className={cn(
          field,
          "rounded-xl px-3 py-2 font-mono text-[11px] leading-relaxed text-red-700 dark:text-red-300",
        )}
      >
        {message}
      </div>
      {onRetry && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            className="text-foreground/70 hover:bg-foreground/[0.06] flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium active:scale-[0.96]"
          >
            <RotateCwIcon className="size-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
