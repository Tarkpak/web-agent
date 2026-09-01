"use client";

import type { ComponentProps } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, ShimmerLabel } from "./surfaces";

export interface WebSearchResult {
  title: string;
  domain: string;
  url?: string;
}

export function WebSearch({
  query,
  results,
  searching,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "query" | "results"> & {
  query: string;
  results: readonly WebSearchResult[];
  searching: boolean;
}) {
  return (
    <div
      data-slot="web-search"
      className={cn("my-2 flex w-full max-w-sm flex-col gap-2.5", className)}
      {...props}
    >
      <span
        className={cn(
          field,
          "text-foreground/70 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-xs",
        )}
      >
        <SearchIcon className="text-foreground/40 size-3" />
        {query || "Web search"}
      </span>
      <div className="text-foreground/45 text-xs">
        {searching ? (
          <ShimmerLabel className="relative inline-block leading-none">Searching</ShimmerLabel>
        ) : (
          <span className="fade-in animate-in duration-300">
            Read {results.length} {results.length === 1 ? "source" : "sources"}
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div className="flex flex-col">
          {results.map((result, index) => {
            const content = (
              <>
                <span className="bg-foreground/[0.06] text-foreground/45 flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-medium">
                  {result.domain.charAt(0).toUpperCase() || "?"}
                </span>
                <span className="text-foreground/90 min-w-0 flex-1 truncate text-[13.5px]">
                  {result.title}
                </span>
                <span className={cn(mono, "text-foreground/35 shrink-0")}>{result.domain}</span>
              </>
            );
            const rowClass =
              "fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] -mx-2.5 flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 duration-300";
            return result.url ? (
              <a
                key={`${result.url}-${index}`}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className={rowClass}
              >
                {content}
              </a>
            ) : (
              <div key={`${result.domain}-${index}`} className={rowClass}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
