"use client";

import { ActionBarMorePrimitive, ActionBarPrimitive, AuiIf } from "@assistant-ui/react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  AudioLinesIcon,
  StopCircleIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { MessageTiming } from "./message-timing";
import { FeedbackDialog } from "./feedback-dialog";
import { RegenerateMenu } from "./regenerate-menu";

export function MessageActions() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      data-slot="message-actions"
      className="text-muted-foreground animate-in fade-in flex items-center gap-1 duration-150"
    >
      <ActionBarPrimitive.Copy
        copiedDuration={2000}
        render={<TooltipIconButton tooltip="Copy response" />}
      >
        <AuiIf condition={(state) => state.message.isCopied}>
          <CheckIcon className="text-emerald-600" />
        </AuiIf>
        <AuiIf condition={(state) => !state.message.isCopied}>
          <CopyIcon />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.FeedbackPositive
        render={
          <TooltipIconButton tooltip="Helpful" className="data-[submitted=true]:text-emerald-600" />
        }
      >
        <ThumbsUpIcon />
      </ActionBarPrimitive.FeedbackPositive>
      <FeedbackDialog />
      <RegenerateMenu />
      <MessageTiming />
      <AuiIf
        condition={(state) => state.thread.capabilities.speech && state.message.speech == null}
      >
        <ActionBarPrimitive.Speak render={<TooltipIconButton tooltip="Read aloud" />}>
          <AudioLinesIcon />
        </ActionBarPrimitive.Speak>
      </AuiIf>
      <AuiIf condition={(state) => state.message.speech != null}>
        <ActionBarPrimitive.StopSpeaking render={<TooltipIconButton tooltip="Stop reading" />}>
          <StopCircleIcon />
        </ActionBarPrimitive.StopSpeaking>
      </AuiIf>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger
          render={
            <TooltipIconButton tooltip="More actions" className="data-[state=open]:bg-accent" />
          }
        >
          <MoreHorizontalIcon />
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="bg-popover text-popover-foreground z-50 min-w-40 rounded-lg border p-1.5 shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown
            render={
              <ActionBarMorePrimitive.Item className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none" />
            }
          >
            <DownloadIcon className="size-4" />
            Export as Markdown
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
}
