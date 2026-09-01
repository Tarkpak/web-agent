"use client";

import type { ComponentProps } from "react";
import { CheckIcon, LoaderCircleIcon, TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export function TerminalBlock({
  command,
  lines,
  visibleCount,
  done,
  className,
  ...props
}: ComponentProps<"div"> & {
  command: string;
  lines: readonly string[];
  visibleCount: number;
  done: boolean;
}) {
  const visibleLines = lines.slice(0, Math.max(0, visibleCount));
  return (
    <div
      data-slot="terminal-block"
      className={cn(paper, "my-2 w-full overflow-hidden rounded-lg", className)}
      {...props}
    >
      <div className="border-border/60 flex min-h-9 items-center gap-2 border-b px-3">
        <TerminalIcon className="text-foreground/45 size-3.5" />
        <code className={cn(mono, "text-foreground/70 min-w-0 flex-1 truncate")}>{command}</code>
        {done ? (
          <CheckIcon className="size-3.5 text-emerald-600" aria-label="Complete" />
        ) : (
          <LoaderCircleIcon
            className="text-foreground/45 size-3.5 animate-spin"
            aria-label="Running"
          />
        )}
      </div>
      <pre
        className={cn(
          mono,
          "bg-foreground/[0.025] max-h-72 min-h-16 overflow-auto p-3 leading-relaxed whitespace-pre-wrap break-words",
        )}
      >
        {visibleLines.length
          ? visibleLines.map((line, index) => (
              <span
                key={`${index}-${line}`}
                className={cn(
                  "block",
                  index === visibleLines.length - 1 ? "text-foreground/85" : "text-foreground/50",
                )}
              >
                {line || " "}
              </span>
            ))
          : null}
        {!done ? (
          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current" aria-hidden />
        ) : null}
      </pre>
    </div>
  );
}
