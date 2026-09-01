"use client";

import { useMessageTiming } from "@assistant-ui/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatMs(value: number | undefined) {
  if (value === undefined) return undefined;
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`;
}

export function MessageTiming() {
  const timing = useMessageTiming();
  if (timing?.totalStreamTime === undefined) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Message timing"
              className="hover:bg-accent h-7 rounded-md px-2 font-mono text-[10px] tabular-nums"
            />
          }
        >
          {formatMs(timing.totalStreamTime)}
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="grid min-w-36 gap-1">
          {timing.firstTokenTime !== undefined && (
            <span className="flex justify-between gap-4">
              First token <b>{formatMs(timing.firstTokenTime)}</b>
            </span>
          )}
          <span className="flex justify-between gap-4">
            Total <b>{formatMs(timing.totalStreamTime)}</b>
          </span>
          {timing.tokensPerSecond !== undefined && (
            <span className="flex justify-between gap-4">
              Speed <b>{timing.tokensPerSecond.toFixed(1)} tok/s</b>
            </span>
          )}
          <span className="flex justify-between gap-4">
            Chunks <b>{timing.totalChunks}</b>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
