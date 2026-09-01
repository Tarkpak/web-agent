"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { field, mono, paper } from "./surfaces";

const REASONS: Record<string, string> = {
  cancelled: "stopped by you",
  length: "hit the length limit",
  "content-filter": "blocked by a content filter",
  error: "failed partway through",
  other: "stopped early",
};

export function StoppedRunNotice() {
  const aui = useAui();
  const status = useAuiState((state) =>
    state.message.role === "assistant" ? state.message.status : undefined,
  );
  const text = useAuiState((state) =>
    state.message.role === "assistant"
      ? state.message.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join(" ")
      : "",
  );
  if (status?.type !== "incomplete" || status.reason === "error") return null;
  return (
    <div data-slot="stopped-run" className={cn(paper, "my-3 w-full max-w-md rounded-lg p-3")}>
      {text ? (
        <p className="text-foreground/65 line-clamp-3 text-xs leading-5">
          {text}
          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current" aria-hidden />
        </p>
      ) : null}
      <div className={cn("flex items-center gap-2", text && "mt-3")}>
        <span className={cn(field, mono, "text-foreground/45 rounded-full px-2 py-1")}>
          {REASONS[status.reason] ?? "stopped early"}
        </span>
        <span className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void aui.message.delete()}
          className="active:scale-[0.96] transition-transform"
        >
          Discard
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => aui.message.reload()}
          className="active:scale-[0.96] transition-transform"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
