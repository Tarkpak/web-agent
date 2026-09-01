"use client";

import { AlertCircleIcon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";
import { ErrorPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function MessageErrorState() {
  const aui = useAui();
  const retrying = useAuiState((state) => state.thread.isRunning);
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(paper, "my-2 flex w-full max-w-md items-start gap-3 rounded-lg p-3")}
    >
      {retrying ? (
        <LoaderCircleIcon className="text-foreground/45 mt-0.5 size-4 shrink-0 animate-spin" />
      ) : (
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">
          {retrying ? "Retrying response" : "Response failed"}
        </p>
        <ErrorPrimitive.Message className="text-foreground/50 mt-1 line-clamp-3 text-xs leading-5" />
      </div>
      {!retrying ? (
        <button
          type="button"
          onClick={() => aui.message.reload()}
          className="text-foreground/55 hover:bg-foreground/[0.06] flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] hover:text-foreground active:scale-[0.96]"
          aria-label="Retry response"
        >
          <RotateCwIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
