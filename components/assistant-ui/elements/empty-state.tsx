"use client";

import type { ComponentProps, ReactNode } from "react";
import { SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { title: string; description: string; children?: ReactNode }) {
  return (
    <div
      data-slot="empty-state"
      className={cn("mx-auto mb-6 flex max-w-lg flex-col items-center px-4 text-center", className)}
      {...props}
    >
      <span className="bg-foreground/[0.05] mb-4 flex size-10 items-center justify-center rounded-lg">
        <SparklesIcon className="text-foreground/55 size-4" />
      </span>
      <h1 className="text-xl font-medium">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">{description}</p>
      {children}
    </div>
  );
}
