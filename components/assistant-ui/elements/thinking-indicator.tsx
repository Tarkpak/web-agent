"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { mono, ShimmerLabel } from "./surfaces";

export function ThinkingIndicator({
  label,
  elapsed,
  className,
  ...props
}: ComponentProps<"div"> & { label: string; elapsed?: string }) {
  return (
    <div
      data-slot="thinking-indicator"
      role="status"
      className={cn("text-foreground/55 flex h-6 items-center gap-2.5 text-xs", className)}
      {...props}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500/45 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
      </span>
      <ShimmerLabel key={label} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
        {label}
      </ShimmerLabel>
      {elapsed !== undefined ? (
        <span
          className={cn(mono, "bg-foreground/[0.04] text-foreground/40 rounded-full px-1.5 py-0.5")}
        >
          {elapsed}
        </span>
      ) : null}
    </div>
  );
}

export function AssistantThinking() {
  const label = useAuiState((state) => {
    if (state.message.status?.type !== "running") return undefined;
    const pending = state.message.parts.find(
      (part) => part.type === "tool-call" && part.result === undefined,
    );
    if (pending?.type === "tool-call") return `Running ${pending.toolName.replaceAll("_", " ")}`;
    return state.message.parts.length === 0 ? "Thinking" : undefined;
  });
  const [elapsed, setElapsed] = useState<string>();
  useEffect(() => {
    if (!label) {
      setElapsed(undefined);
      return;
    }
    const start = Date.now();
    const update = () => setElapsed(`${Math.floor((Date.now() - start) / 1000)}s`);
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [label]);
  return label ? <ThinkingIndicator label={label} elapsed={elapsed} /> : null;
}
