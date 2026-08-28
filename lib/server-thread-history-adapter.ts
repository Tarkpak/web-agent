"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAui,
  type AssistantClient,
  type MessageFormatAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import type { ThreadListItemMethods } from "@assistant-ui/core/store";

type StoredMessage = {
  id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  format: string;
  content: Record<string, unknown>;
};

async function listMessages(remoteId: string): Promise<StoredMessage[]> {
  const res = await fetch(`/api/threads/${remoteId}/messages`);
  if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
  return (await res.json()).messages as StoredMessage[];
}

async function appendMessage(
  remoteId: string,
  message: {
    id: string;
    parent_id: string | null;
    format: string;
    content: Record<string, unknown>;
  },
): Promise<void> {
  const res = await fetch(`/api/threads/${remoteId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error(`Failed to append message (${res.status})`);
}

async function updateMessage(
  remoteId: string,
  messageId: string,
  content: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/api/threads/${remoteId}/messages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to update message (${res.status})`);
}

/**
 * Persists thread history to the local server store. Mirrors the
 * AssistantCloudThreadHistoryAdapter contract: `withFormat` produces the
 * format-aware adapter consumed by `useChatRuntime` (ai-sdk/v6 storage), and
 * the thread-list runtime binds it to a thread via `pin`/`resolvePinned`.
 */
export class ServerThreadHistoryAdapter implements ThreadHistoryAdapter {
  private getAui: () => AssistantClient;

  constructor(getAui: () => AssistantClient) {
    this.getAui = getAui;
  }

  get aui(): AssistantClient {
    return this.getAui();
  }

  private tryGetKeyedThreadListItem(): ThreadListItemMethods | undefined {
    const live = this.aui.threadListItem;
    if (!live.source) return undefined;
    const id = live.getState().id;
    if (id === undefined) return undefined;
    return this.aui.threads.item({ id });
  }

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    let threadListItem: ThreadListItemMethods | undefined;
    const pinCurrent = () => {
      const next = this.tryGetKeyedThreadListItem();
      if (next) threadListItem = next;
      return threadListItem;
    };
    const resolvePinned = () => threadListItem ?? pinCurrent();
    return {
      pin: () => {
        pinCurrent();
      },
      load: async () => {
        pinCurrent();
        const live = this.aui.threadListItem;
        const remoteId = live.source ? live.getState().remoteId : undefined;
        if (!remoteId) return { messages: [] };
        const messages = await listMessages(remoteId);
        return {
          messages: messages
            .filter((m) => m.format === formatAdapter.format)
            .map((m) =>
              formatAdapter.decode({
                id: m.id,
                parent_id: m.parent_id,
                format: m.format,
                content: m.content as TStorageFormat,
              }),
            ),
        };
      },
      append: async (item: { parentId: string | null; message: TMessage }) => {
        const pinned = resolvePinned();
        if (!pinned) throw new Error("Cannot persist history without a thread list item.");
        const remoteId = pinned.getState().remoteId ?? (await pinned.initialize()).remoteId;
        await appendMessage(remoteId, {
          id: formatAdapter.getId(item.message),
          parent_id: item.parentId,
          format: formatAdapter.format,
          content: formatAdapter.encode(item),
        });
      },
      update: async (
        item: { parentId: string | null; message: TMessage },
        localMessageId: string,
      ) => {
        const pinned = resolvePinned();
        const remoteId = pinned?.getState().remoteId;
        if (!remoteId || !pinned) return;
        await updateMessage(
          remoteId,
          localMessageId ?? formatAdapter.getId(item.message),
          formatAdapter.encode(item),
        );
      },
    };
  }

  // Direct `ThreadHistoryAdapter` entry points are unused: `useChatRuntime`
  // always goes through `withFormat`.
  async load() {
    return { messages: [] };
  }

  async append(): Promise<void> {
    throw new Error("ServerThreadHistoryAdapter: use the withFormat adapter.");
  }
}

/** React binding: exposes the history adapter through `unstable_useAdapters`. */
export function useServerThreadListAdapters() {
  const aui = useAui();
  const auiRef = useRef(aui);
  useEffect(() => {
    auiRef.current = aui;
  });
  const [history] = useState(() => new ServerThreadHistoryAdapter(() => auiRef.current));
  return useMemo(() => ({ history }), [history]);
}
