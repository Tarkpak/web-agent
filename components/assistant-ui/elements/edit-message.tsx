"use client";

import { ComposerPrimitive, MessagePrimitive, useAuiState } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function EditMessage() {
  const laterReplies = useAuiState((state) => {
    const index = state.thread.messages.findIndex((message) => message.id === state.message.id);
    return index < 0 ? 0 : state.thread.messages.length - index - 1;
  });
  return (
    <MessagePrimitive.Root data-slot="edit-message" className="flex flex-col px-2">
      <ComposerPrimitive.Root
        className={cn(paper, "ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-lg p-2")}
      >
        <ComposerPrimitive.Input
          className="text-foreground min-h-20 w-full resize-none bg-transparent px-2 py-1 text-base leading-6 outline-none"
          autoFocus
        />
        {laterReplies > 0 ? (
          <p className="text-foreground/45 px-2 pb-2 text-xs">
            Updating this message replaces {laterReplies} later{" "}
            {laterReplies === 1 ? "reply" : "replies"} on this branch.
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <ComposerPrimitive.Cancel
            render={
              <Button
                variant="ghost"
                size="sm"
                className="active:scale-[0.96] transition-transform"
              />
            }
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            render={<Button size="sm" className="active:scale-[0.96] transition-transform" />}
          >
            Update
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}
