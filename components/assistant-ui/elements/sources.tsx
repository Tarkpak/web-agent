"use client";

import { memo, useState, type ComponentProps } from "react";
import { FileTextIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { SourceMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const sourceVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        outline:
          "border-input text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground border bg-transparent",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        muted: "bg-muted text-muted-foreground [a&]:hover:bg-muted/80 [a&]:hover:text-foreground",
        ghost:
          "text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground bg-transparent",
      },
      size: {
        sm: "px-1.5 py-0.5",
        default: "px-2 py-1",
        lg: "px-2.5 py-1.5 text-sm",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  },
);

const extractDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function SourceIcon({ url, className, ...props }: ComponentProps<"span"> & { url: string }) {
  const domain = extractDomain(url);
  const src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        data-slot="source-icon-fallback"
        className={cn(
          "bg-muted flex size-3 shrink-0 items-center justify-center rounded-sm text-[10px] font-medium",
          className,
        )}
        {...props}
      >
        {domain.charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <img
      data-slot="source-icon"
      src={src}
      alt=""
      className={cn("size-3 shrink-0 rounded-sm", className)}
      onError={() => setFailed(true)}
    />
  );
}

function SourceTitle({ className, ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="source-title" className={cn("max-w-48 truncate", className)} {...props} />
  );
}

export type SourceProps = ComponentProps<"a"> & VariantProps<typeof sourceVariants>;

function Source({ className, variant, size, ...props }: SourceProps) {
  return (
    <a
      data-slot="source"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        sourceVariants({ variant, size }),
        "focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer outline-none focus-visible:ring-1",
        className,
      )}
      {...props}
    />
  );
}

const SourcesImpl: SourceMessagePartComponent = (part) => {
  if (part.sourceType === "url" && part.url) {
    const domain = extractDomain(part.url);
    return (
      <Source href={part.url}>
        <SourceIcon url={part.url} />
        <SourceTitle>{part.title || domain}</SourceTitle>
      </Source>
    );
  }
  if (part.sourceType === "document") {
    return (
      <span
        data-slot="source"
        className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
      >
        <FileTextIcon className="size-3" />
        <SourceTitle>{part.title}</SourceTitle>
      </span>
    );
  }
  return null;
};

export const Sources = memo(SourcesImpl);
