"use client";

import { useEffect, useRef, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { PencilIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";

type SavedDraft = { text: string; savedAt: number };
const keyFor = (threadId: string) => `agent-shell:draft:${threadId}`;

export function DraftRestore() {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threads.mainThreadId ?? "new");
  const text = useAuiState((s) => s.composer.text);
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const loadedThread = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (loadedThread.current === threadId) return;
    loadedThread.current = threadId;
    try {
      const raw = localStorage.getItem(keyFor(threadId));
      const value = raw ? (JSON.parse(raw) as SavedDraft) : null;
      setSaved(value?.text ? value : null);
    } catch {
      setSaved(null);
    }
  }, [threadId]);

  useEffect(() => {
    if (loadedThread.current !== threadId) return;
    const id = window.setTimeout(() => {
      if (text.trim()) {
        const next = { text, savedAt: Date.now() };
        localStorage.setItem(keyFor(threadId), JSON.stringify(next));
      } else if (!saved) {
        localStorage.removeItem(keyFor(threadId));
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [saved, text, threadId]);

  if (!saved || text.trim()) return null;
  const minutes = Math.max(0, Math.round((Date.now() - saved.savedAt) / 60000));

  const dismiss = () => {
    localStorage.removeItem(keyFor(threadId));
    setSaved(null);
  };
  return (
    <div className="border-border/60 bg-muted/40 flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-xs">
      <PencilIcon className="text-muted-foreground size-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate">{saved.text}</p>
        <p className="text-muted-foreground">
          Unsent draft · {minutes < 1 ? "just now" : `${minutes}m ago`}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7"
        onClick={() => {
          aui.composer.setText(saved.text);
          dismiss();
        }}
      >
        Restore
      </Button>
      <TooltipIconButton tooltip="Discard draft" className="size-7" onClick={dismiss}>
        <XIcon className="size-3.5" />
      </TooltipIconButton>
    </div>
  );
}
