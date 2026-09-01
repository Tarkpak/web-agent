"use client";

import { useMemo, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";

type Hit = { id: string; messageId: string; context: string };

export function ConversationSearch({ onClose }: { onClose?: () => void }) {
  const messages = useAuiState((s) => s.thread.messages);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo<Hit[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const found: Hit[] = [];
    for (const message of messages) {
      const value = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ");
      const lower = value.toLowerCase();
      let from = 0;
      let at = lower.indexOf(needle, from);
      while (at !== -1) {
        found.push({
          id: `${message.id}:${at}`,
          messageId: message.id,
          context: value.slice(Math.max(0, at - 28), at + query.length + 28),
        });
        from = at + needle.length;
        at = lower.indexOf(needle, from);
      }
    }
    return found;
  }, [messages, query]);

  const step = (delta: number) => {
    if (!hits.length) return;
    const next = (active + delta + hits.length) % hits.length;
    setActive(next);
    const messageId = hits[next]?.messageId;
    if (!messageId) return;
    document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  };

  return (
    <div className="border-border/60 bg-background flex flex-col gap-1.5 rounded-md border p-2 shadow-sm">
      <div className="flex items-center gap-1">
        <SearchIcon className="text-muted-foreground ml-1 size-3.5" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
          }}
          placeholder="Find in conversation"
          className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <span className="text-muted-foreground min-w-12 text-center font-mono text-[10px]">
          {hits.length ? `${Math.min(active + 1, hits.length)}/${hits.length}` : "0"}
        </span>
        <TooltipIconButton tooltip="Previous match" className="size-7" onClick={() => step(-1)}>
          <ChevronUpIcon className="size-3.5" />
        </TooltipIconButton>
        <TooltipIconButton tooltip="Next match" className="size-7" onClick={() => step(1)}>
          <ChevronDownIcon className="size-3.5" />
        </TooltipIconButton>
        {onClose && (
          <TooltipIconButton tooltip="Close search" className="size-7" onClick={onClose}>
            <XIcon className="size-3.5" />
          </TooltipIconButton>
        )}
      </div>
      {hits[active] && (
        <p className="text-muted-foreground truncate px-2 text-xs">{hits[active].context}</p>
      )}
    </div>
  );
}
