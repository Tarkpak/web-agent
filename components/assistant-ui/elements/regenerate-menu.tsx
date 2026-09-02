"use client";

import { useState } from "react";
import { useAui } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import { useOptionalShell } from "@/components/shell-context";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function RegenerateMenu() {
  const aui = useAui();
  const shell = useOptionalShell();
  const [open, setOpen] = useState(false);
  const options = shell?.models.filter((model) => model.kind === "chat") ?? [];

  if (!shell || options.length < 2) {
    return (
      <TooltipIconButton tooltip="Regenerate" onClick={() => aui.message.reload()}>
        <RefreshCwIcon />
      </TooltipIconButton>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot="regenerate-menu"
        render={
          <TooltipIconButton
            tooltip="Regenerate with"
            aria-label="Regenerate with a different model"
          />
        }
      >
        <RefreshCwIcon />
        <ChevronDownIcon className="size-2.5" />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        className={cn(paper, "max-h-64 w-64 gap-0 overflow-y-auto rounded-md p-1 shadow-md")}
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
      </PopoverContent>
    </Popover>
  );
}
