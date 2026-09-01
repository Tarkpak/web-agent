"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const paper = "bg-background border border-border/60 dark:bg-popover";

export const field = "bg-foreground/[0.04] dark:bg-foreground/[0.06]";

export const fieldInteractive =
  "bg-foreground/[0.04] transition-colors hover:bg-foreground/[0.07] dark:bg-foreground/[0.06] dark:hover:bg-foreground/[0.09]";

export const ghostButton =
  "flex items-center justify-center rounded-full text-foreground/45 outline-none transition-[background-color,color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground/90 active:scale-[0.96] focus-visible:ring-1 focus-visible:ring-foreground/20 motion-reduce:transition-none dark:hover:bg-foreground/[0.09]";

export const mono = "font-mono text-[11px] tracking-tight";

export const collapsePanel =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none";

export function ShimmerLabel({
  active = true,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean }) {
  return (
    <span className={cn(active && "shimmer motion-reduce:animate-none", className)} {...props} />
  );
}
