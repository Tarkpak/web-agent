"use client";

import {
  ComposerAddAttachment,
  ComposerAttachments,
} from "@/components/assistant-ui/elements/attachment";
import { ComposerModelSelect } from "@/components/assistant-ui/elements/composer-model-picker";
import { ContextDisplay } from "@/components/assistant-ui/elements/context-display";
import { ComposerQuotePreview } from "@/components/assistant-ui/elements/quote";
import { DraftRestore } from "@/components/assistant-ui/elements/draft-restore";
import { EnqueueButton, MessageQueue } from "@/components/assistant-ui/elements/message-queue";
import {
  ComposerDictationStatus,
  ComposerVoiceInput,
} from "@/components/assistant-ui/elements/composer-voice";
import { useOptionalShell } from "@/components/shell-context";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

export function Composer({ autoFocus }: { autoFocus: boolean }) {
  const shell = useOptionalShell();
  const imageMode = shell?.models.find((model) => model.id === shell.modelId)?.kind === "image";

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <MessageQueue />
      <DraftRestore />
      <ComposerPrimitive.AttachmentDropzone
        render={
          <div
            data-slot="aui_composer-shell"
            className="border-border/80 data-[dragging=true]:border-ring focus-within:border-foreground/25 focus-within:shadow-[0_8px_30px_oklch(0_0_0/0.06)] dark:border-muted-foreground/20 dark:focus-within:border-muted-foreground/40 flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-[border-color,box-shadow] duration-200 data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))]"
          />
        }
      >
        <ComposerAttachments />
        <ComposerQuotePreview />
        <div className="flex min-w-0 items-center">
          <AuiIf condition={(state) => state.composer.dictation == null}>
            <ComposerPrimitive.Input
              placeholder={
                imageMode ? "Describe the image to generate or edit..." : "Ask the agent..."
              }
              className="aui-composer-input caret-primary placeholder:text-muted-foreground/60 max-h-48 min-h-11 w-full resize-none bg-transparent px-2.5 py-1.5 text-base leading-6 outline-none"
              rows={1}
              autoFocus={autoFocus}
              enterKeyHint="send"
              aria-label="Message input"
            />
          </AuiIf>
          <ComposerDictationStatus />
        </div>
        <ComposerActions />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function ComposerActions() {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <ComposerAddAttachment />
        <ComposerModelSelect />
        <ContextDisplay />
      </div>
      <div className="flex items-center gap-1.5">
        <ComposerVoiceInput />
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send
            render={
              <TooltipIconButton
                tooltip="Send message"
                side="bottom"
                type="button"
                variant="default"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Send message"
              />
            }
          >
            <ArrowUpIcon className="size-4" />
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <EnqueueButton />
          <ComposerPrimitive.Cancel
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Stop generating"
              />
            }
          >
            <SquareIcon className="size-3.5 fill-current" />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
}
