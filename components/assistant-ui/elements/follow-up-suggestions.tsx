"use client";

import { AuiIf, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowUpRightIcon } from "lucide-react";

function SuggestionsRow() {
  const suggestions = useAuiState((state) => state.thread.suggestions);
  return (
    <div
      data-slot="follow-up-suggestions"
      className="flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
    >
      {suggestions.map((suggestion, index) => (
        <ThreadPrimitive.Suggestion
          key={`${suggestion.prompt}-${index}`}
          prompt={suggestion.prompt}
          clearComposer
          send
          className="border-border/60 bg-background hover:bg-foreground/[0.035] text-foreground/70 flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors active:scale-[0.96]"
        >
          <span>{suggestion.title ?? suggestion.prompt}</span>
          {suggestion.label ? <span className="text-foreground/40">{suggestion.label}</span> : null}
          <ArrowUpRightIcon className="size-3" />
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

export function FollowUpSuggestions() {
  return (
    <AuiIf
      condition={(state) =>
        !state.thread.isEmpty && !state.thread.isRunning && state.thread.suggestions.length > 0
      }
    >
      <SuggestionsRow />
    </AuiIf>
  );
}
