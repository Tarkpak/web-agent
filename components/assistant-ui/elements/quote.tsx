"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  SelectionToolbarPrimitive,
} from "@assistant-ui/react";
import { QuoteIcon, XIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";

export function MessageQuote() {
  return (
    <MessagePrimitive.Quote>
      {({ text }) => (
        <blockquote className="border-foreground/20 text-muted-foreground mb-2 border-l-2 pl-3 text-sm">
          <span className="line-clamp-3">{text}</span>
        </blockquote>
      )}
    </MessagePrimitive.Quote>
  );
}

export function SelectionToolbar() {
  return (
    <SelectionToolbarPrimitive.Root className="bg-popover text-popover-foreground z-50 rounded-md border p-1 shadow-md">
      <SelectionToolbarPrimitive.Quote className="hover:bg-accent focus-visible:ring-ring flex h-8 items-center gap-2 rounded-sm px-2.5 text-sm outline-none focus-visible:ring-2">
        <QuoteIcon className="size-3.5" />
        Quote
      </SelectionToolbarPrimitive.Quote>
    </SelectionToolbarPrimitive.Root>
  );
}

export function ComposerQuotePreview() {
  return (
    <ComposerPrimitive.Quote className="bg-muted/60 text-muted-foreground flex min-w-0 items-start gap-2 rounded-md px-2.5 py-2 text-sm">
      <QuoteIcon className="mt-0.5 size-3.5 shrink-0" />
      <ComposerPrimitive.QuoteText className="line-clamp-2 min-w-0 flex-1" />
      <ComposerPrimitive.QuoteDismiss
        render={<TooltipIconButton tooltip="Dismiss quote" className="-my-1 size-6 shrink-0" />}
      >
        <XIcon className="size-3.5" />
      </ComposerPrimitive.QuoteDismiss>
    </ComposerPrimitive.Quote>
  );
}
