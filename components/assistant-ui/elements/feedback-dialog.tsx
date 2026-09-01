"use client";

import { useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { ThumbsDownIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const REASONS = ["Not factual", "Missed instructions", "Too verbose", "Unsafe"] as const;

export function FeedbackDialog() {
  const aui = useAui();
  const messageId = useAuiState((s) => s.message.id);
  const submitted = useAuiState((s) => s.message.metadata.submittedFeedback?.type === "negative");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, type: "negative", reasons: selected, note }),
      });
      if (!response.ok) throw new Error(`Failed to submit feedback (${response.status})`);
      aui.message.submitFeedback({ type: "negative" });
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <TooltipIconButton
            tooltip="Report an issue"
            className={submitted ? "text-red-500" : undefined}
          />
        }
      >
        <ThumbsDownIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What went wrong?</DialogTitle>
          <DialogDescription>Your feedback is attached to this response.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              aria-pressed={selected.includes(reason)}
              onClick={() =>
                setSelected((current) =>
                  current.includes(reason)
                    ? current.filter((item) => item !== reason)
                    : [...current, reason],
                )
              }
              className="aria-pressed:bg-foreground aria-pressed:text-background hover:bg-accent rounded-full border px-3 py-1.5 text-xs"
            >
              {reason}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add details (optional)"
          className="border-input bg-background min-h-24 resize-y rounded-md border p-2.5 text-sm outline-none focus-visible:ring-2"
        />
        <Button type="button" onClick={() => void submit()} disabled={sending}>
          {sending ? "Sending..." : "Send feedback"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
