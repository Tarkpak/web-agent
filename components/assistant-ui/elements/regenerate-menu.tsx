"use client";

import { useEffect, useRef, useState } from "react";
import { useAui } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import { useOptionalShell } from "@/components/shell-context";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function RegenerateMenu() {
  const aui = useAui();
  const shell = useOptionalShell();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = shell?.models.filter((model) => model.kind === "chat") ?? [];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!shell || options.length < 2) {
    return (
      <TooltipIconButton tooltip="Regenerate" onClick={() => aui.message.reload()}>
        <RefreshCwIcon />
      </TooltipIconButton>
    );
  }

  return (
    <div ref={root} data-slot="regenerate-menu" className="relative flex">
      <TooltipIconButton
        tooltip="Regenerate with"
        aria-label="Regenerate with a different model"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <RefreshCwIcon />
        <ChevronDownIcon className="size-2.5" />
      </TooltipIconButton>
      {open && (
        <div
          className={cn(
            paper,
            "absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-md p-1 shadow-md",
          )}
        >
          {options.map((option) => {
            const current = option.id === shell.modelId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  shell.setModelId(option.id);
                  setOpen(false);
                  queueMicrotask(() => aui.message.reload());
                }}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs"
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {current ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <span className="text-muted-foreground">{option.ownedBy}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
