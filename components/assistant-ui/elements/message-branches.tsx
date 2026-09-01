"use client";

import { BranchPickerPrimitive } from "@assistant-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { mono } from "./surfaces";

export function MessageBranches({ className, ...props }: BranchPickerPrimitive.Root.Props) {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      data-slot="message-branches"
      className={cn("text-foreground/45 inline-flex h-7 items-center gap-0.5", className)}
      {...props}
    >
      <BranchPickerPrimitive.Previous render={<TooltipIconButton tooltip="Previous version" />}>
        <ChevronLeftIcon />
      </BranchPickerPrimitive.Previous>
      <span className={cn(mono, "min-w-9 text-center")}>
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next render={<TooltipIconButton tooltip="Next version" />}>
        <ChevronRightIcon />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}
