"use client";

import { useEffect, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

export function GenerationLoader({
  label = "Generating",
  active,
}: {
  label?: string;
  active?: boolean;
}) {
  const waiting = useAuiState((s) => {
    if (!s.thread.isRunning) return false;
    const last = s.thread.messages.at(-1);
    return last?.role === "assistant" && last.parts.length === 0;
  });
  const [tick, setTick] = useState(0);

  const visible = active ?? waiting;

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 120);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;
  return (
    <div role="status" className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs">
      <span aria-hidden className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }, (_, index) => {
          const distance = Math.abs(index - (tick % 9));
          return (
            <span
              key={index}
              className={cn(
                "bg-foreground size-1 rounded-[1px] transition-opacity",
                distance < 2 ? "opacity-80" : "opacity-15",
              )}
            />
          );
        })}
      </span>
      <span>{label}</span>
    </div>
  );
}
