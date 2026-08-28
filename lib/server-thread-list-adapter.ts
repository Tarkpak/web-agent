"use client";

import { z } from "zod";
import { AssistantStream, DataStreamDecoder } from "assistant-stream";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { RemoteThreadMetadata } from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/react";
import { useServerThreadListAdapters } from "@/lib/server-thread-history-adapter";

const ThreadSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  is_archived: z.boolean(),
  created_at: z.string(),
  last_message_at: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const ListResponseSchema = z.object({ threads: z.array(ThreadSchema) });

const toMetadata = (t: z.infer<typeof ThreadSchema>): RemoteThreadMetadata => ({
  status: t.is_archived ? "archived" : "regular",
  remoteId: t.id,
  title: t.title ?? undefined,
  lastMessageAt: t.last_message_at ? new Date(t.last_message_at) : undefined,
  externalId: undefined,
  custom: t.metadata ?? undefined,
});

async function fetchThreads(): Promise<RemoteThreadMetadata[]> {
  const res = await fetch("/api/threads");
  if (!res.ok) throw new Error(`Failed to load threads (${res.status})`);
  const parsed = ListResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Invalid thread list response");
  return parsed.data.threads.map(toMetadata);
}

async function fetchThread(remoteId: string): Promise<RemoteThreadMetadata | null> {
  const res = await fetch(`/api/threads/${remoteId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load thread (${res.status})`);
  const parsed = ThreadSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Invalid thread response");
  return toMetadata(parsed.data);
}

async function createThread(): Promise<string> {
  const res = await fetch("/api/threads", { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create thread (${res.status})`);
  const body = (await res.json()) as { thread_id?: unknown };
  if (typeof body.thread_id !== "string") throw new Error("Invalid create thread response");
  return body.thread_id;
}

async function patchThread(
  remoteId: string,
  patch: { title?: string; is_archived?: boolean; metadata?: Record<string, unknown> | null },
): Promise<void> {
  const res = await fetch(`/api/threads/${remoteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update thread (${res.status})`);
}

async function deleteThread(remoteId: string): Promise<void> {
  const res = await fetch(`/api/threads/${remoteId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete thread (${res.status})`);
}

function firstUserText(messages: readonly ThreadMessage[]): string | undefined {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.content
      .filter(
        (part): part is Extract<(typeof message.content)[number], { type: "text" }> =>
          part.type === "text",
      )
      .map((part) => part.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return undefined;
}

async function generateTitle(
  remoteId: string,
  messages: readonly ThreadMessage[],
): Promise<AssistantStream> {
  const res = await fetch(`/api/threads/${remoteId}/title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: firstUserText(messages) }),
  });
  if (!res.ok) throw new Error(`Failed to generate title (${res.status})`);
  return AssistantStream.fromResponse(res, new DataStreamDecoder());
}

// Keep the adapter identity stable. Replacing it makes assistant-ui reset and
// reload the thread list; this is especially visible during development HMR.
export const serverThreadListAdapter: RemoteThreadListAdapter = {
  list: async ({ after } = {}) => {
    if (after) return { threads: [] };
    return { threads: await fetchThreads() };
  },
  rename: async (remoteId, newTitle) => {
    await patchThread(remoteId, { title: newTitle });
  },
  archive: async (remoteId) => {
    await patchThread(remoteId, { is_archived: true });
  },
  unarchive: async (remoteId) => {
    await patchThread(remoteId, { is_archived: false });
  },
  updateCustom: async (remoteId, custom) => {
    await patchThread(remoteId, { metadata: custom ?? null });
  },
  delete: async (remoteId) => {
    await deleteThread(remoteId);
  },
  initialize: async () => {
    return { remoteId: await createThread() };
  },
  fetch: async (remoteId) => {
    const thread = await fetchThread(remoteId);
    if (!thread) throw new Error(`Thread not found: ${remoteId}`);
    return thread;
  },
  generateTitle,
  unstable_useAdapters: useServerThreadListAdapters,
};
