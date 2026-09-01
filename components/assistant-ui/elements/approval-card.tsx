"use client";

import type { ComponentProps, ReactNode } from "react";
import { CheckIcon, ClipboardCheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { field, paper } from "./surfaces";
import { AgentPlan } from "./agent-plan";

export type ApprovalState = "preparing" | "request" | "running" | "done" | "denied";

export function ApprovalCard({
  state,
  title,
  subtitle,
  steps,
  onApprove,
  onDeny,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  state: ApprovalState;
  title: string;
  subtitle: string;
  steps: readonly string[];
  onApprove?: () => void;
  onDeny?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      data-slot="approval-card"
      className={cn(paper, "my-2 w-full max-w-md overflow-hidden rounded-lg", className)}
      {...props}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="bg-foreground/[0.05] flex size-8 shrink-0 items-center justify-center rounded-md">
          <ClipboardCheckIcon className="text-foreground/55 size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">{title}</p>
          <p className="text-foreground/50 mt-0.5 text-xs leading-5">{subtitle}</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <AgentPlan
          className={cn(field, "border-0")}
          steps={steps}
          activeIndex={state === "done" ? steps.length : 0}
        />
      </div>
      {children}
      <div className="border-border/60 border-t px-3 py-2.5">
        {state === "request" ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeny}
              className="active:scale-[0.96] transition-transform"
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApprove}
              className="active:scale-[0.96] transition-transform"
            >
              Approve
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2 text-xs",
              state === "denied"
                ? "text-red-600"
                : state === "done"
                  ? "text-emerald-600"
                  : "text-foreground/55",
            )}
          >
            {state === "running" || state === "preparing" ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : state === "done" ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <XIcon className="size-3.5" />
            )}
            {state === "preparing"
              ? "Preparing plan"
              : state === "running"
                ? "Approved, continuing"
                : state === "done"
                  ? "Plan approved"
                  : "Plan rejected"}
          </div>
        )}
      </div>
    </div>
  );
}
