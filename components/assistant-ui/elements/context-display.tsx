"use client";

import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useThreadTokenUsage } from "@assistant-ui/ai-sdk";

const CONTEXT_WINDOW_ESTIMATE = 128_000;

function messageCharacters(value: unknown): number {
  if (typeof value === "string") return value.startsWith("data:image/") ? 0 : value.length;
  if (Array.isArray(value))
    return value.reduce<number>((total, item) => total + messageCharacters(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (total, item) => total + messageCharacters(item),
      0,
    );
  }
  return 0;
}

export function ContextDisplay({ className }: { className?: string }) {
  const messages = useAuiState((s) => s.thread.messages);
  const usage = useThreadTokenUsage();
  const estimatedTokens = useMemo(
    () => Math.ceil(messages.reduce((total, message) => total + messageCharacters(message), 0) / 4),
    [messages],
  );
  const tokens = usage?.totalTokens ?? estimatedTokens;
  const measured = usage?.totalTokens !== undefined;
  const percent = Math.min((tokens / CONTEXT_WINDOW_ESTIMATE) * 100, 100);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={measured ? "Latest token usage" : "Estimated context usage"}
              className={cn(
                "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs",
                className,
              )}
            />
          }
        >
          <span className="bg-muted relative size-4 rounded-full">
            <span
              className="bg-foreground absolute inset-x-0 bottom-0 rounded-b-full"
              style={{ height: `${percent}%` }}
            />
          </span>
          {Math.round(percent)}%
        </TooltipTrigger>
        <TooltipContent side="top" className="w-56 p-3 text-left">
          <div className="flex justify-between gap-3 text-xs">
            <span className="font-medium">
              {measured ? "Latest run usage" : "Estimated context"}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {tokens.toLocaleString()} / {CONTEXT_WINDOW_ESTIMATE.toLocaleString()}
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-[11px] leading-4">
            {measured
              ? `${usage.inputTokens?.toLocaleString() ?? "?"} input · ${usage.outputTokens?.toLocaleString() ?? "?"} output. The context limit remains a 128k display assumption.`
              : "Estimated from message text because the provider did not return token usage. The model context limit is a 128k display assumption."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
