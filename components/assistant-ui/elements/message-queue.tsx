"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUpIcon, ListPlusIcon, XIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

type QueuedMessage = { id: string; text: string };
type QueueContextValue = {
  enqueueComposer: () => void;
  canEnqueue: boolean;
  queue: readonly QueuedMessage[];
  remove: (id: string) => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

export function MessageQueueProvider({ children }: PropsWithChildren) {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threads.mainThreadId ?? "new");
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const composerText = useAuiState((s) => s.composer.text);
  const attachmentCount = useAuiState((s) => s.composer.attachments.length);
  const [queues, setQueues] = useState<Record<string, QueuedMessage[]>>({});
  const wasRunning = useRef(false);
  const queue = queues[threadId] ?? [];

  const enqueueComposer = useCallback(() => {
    const text = aui.composer.getState().text.trim();
    if (!text || aui.composer.getState().attachments.length) return;
    setQueues((current) => ({
      ...current,
      [threadId]: [...(current[threadId] ?? []), { id: crypto.randomUUID(), text }],
    }));
    aui.composer.setText("");
  }, [aui, threadId]);

  useEffect(() => {
    const justFinished = wasRunning.current && !isRunning;
    wasRunning.current = isRunning;
    if (!justFinished || queue.length === 0) return;
    const [next, ...rest] = queue;
    if (!next) return;
    setQueues((current) => ({ ...current, [threadId]: rest }));
    queueMicrotask(() => {
      aui.thread.append({ role: "user", content: [{ type: "text", text: next.text }] });
    });
  }, [aui, isRunning, queue, threadId]);

  const value = useMemo(
    () => ({
      enqueueComposer,
      canEnqueue: Boolean(composerText.trim()) && attachmentCount === 0,
      queue,
      remove: (id: string) =>
        setQueues((current) => ({
          ...current,
          [threadId]: (current[threadId] ?? []).filter((item) => item.id !== id),
        })),
    }),
    [attachmentCount, composerText, enqueueComposer, queue, threadId],
  );

  return (
    <QueueContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite">
        {queue.length ? `${queue.length} messages queued` : ""}
      </div>
    </QueueContext.Provider>
  );
}

export function useMessageQueue() {
  const value = useContext(QueueContext);
  if (!value) throw new Error("useMessageQueue must be used inside MessageQueueProvider");
  return value;
}

export function MessageQueue() {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const { queue, remove } = useMessageQueue();
  const runningText = useAuiState((s) => {
    if (!s.thread.isRunning) return "";
    const message = [...s.thread.messages].reverse().find((item) => item.role === "user");
    return (
      message?.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ") ?? ""
    );
  });
  if (!isRunning && queue.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 px-1">
      {isRunning && runningText && (
        <div className={cn(field, "flex items-center gap-2 rounded-md px-3 py-2 text-xs")}>
          <span className="bg-foreground size-1.5 animate-pulse rounded-full" />
          <span className="min-w-0 flex-1 truncate">{runningText}</span>
          <span className={cn(mono, "text-muted-foreground")}>running</span>
        </div>
      )}
      {queue.map((item, index) => (
        <div
          key={item.id}
          className={cn(field, "flex items-center gap-2 rounded-md px-3 py-2 text-xs")}
        >
          <span className={cn(mono, "text-muted-foreground")}>{index + 1}</span>
          <span className="min-w-0 flex-1 truncate">{item.text}</span>
          <ArrowUpIcon className="text-muted-foreground size-3" />
          <TooltipIconButton
            tooltip="Remove from queue"
            className="size-6"
            onClick={() => remove(item.id)}
          >
            <XIcon className="size-3.5" />
          </TooltipIconButton>
        </div>
      ))}
    </div>
  );
}

export function EnqueueButton() {
  const { enqueueComposer, canEnqueue } = useMessageQueue();
  return (
    <TooltipIconButton
      tooltip="Queue message"
      type="button"
      variant="default"
      size="icon"
      className="size-7 rounded-full"
      disabled={!canEnqueue}
      onClick={enqueueComposer}
    >
      <ListPlusIcon className="size-4" />
    </TooltipIconButton>
  );
}
