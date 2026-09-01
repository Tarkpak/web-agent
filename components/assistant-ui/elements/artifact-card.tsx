"use client";

import type { ComponentProps } from "react";
import {
  ArrowUpRightIcon,
  FileCodeIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PresentationIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper, ShimmerLabel } from "./surfaces";

export function ArtifactCard({
  title,
  meta,
  generating = false,
  words = 0,
  kind = "document",
  className,
  onClick,
  ...props
}: ComponentProps<"div"> & {
  title: string;
  meta: string;
  generating?: boolean;
  words?: number;
  kind?: "document" | "code" | "presentation";
}) {
  const Icon =
    kind === "code" ? FileCodeIcon : kind === "presentation" ? PresentationIcon : FileTextIcon;
  const interactive = typeof onClick === "function";
  return (
    <div
      data-slot="artifact-card"
      className={cn(
        paper,
        "group my-2 flex min-h-16 w-full max-w-md items-center gap-3 rounded-lg p-3",
        interactive &&
          "cursor-pointer transition-[background-color,scale] duration-150 hover:bg-foreground/[0.025] active:scale-[0.96]",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <span className="bg-foreground/[0.05] flex size-9 shrink-0 items-center justify-center rounded-md">
        {generating ? (
          <LoaderCircleIcon className="text-foreground/50 size-4 animate-spin" />
        ) : (
          <Icon className="text-foreground/55 size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{title}</p>
        <p className={cn(mono, "text-foreground/45 mt-1")}>
          {generating ? (
            <>
              <ShimmerLabel>Writing</ShimmerLabel>
              {words > 0 ? ` · ${words} words` : null}
            </>
          ) : (
            meta
          )}
        </p>
      </div>
      {interactive ? (
        <ArrowUpRightIcon className="text-foreground/30 size-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      ) : null}
    </div>
  );
}
