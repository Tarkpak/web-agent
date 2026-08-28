import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Server-side persistence for chat threads and messages.
 *
 * Storage: a single JSON file (`.data/threads.json`) written atomically
 * (temp file + rename). All mutations are serialized through a promise
 * chain so concurrent requests cannot interleave writes. Message ids are
 * client-generated (the runtime owns them); this store treats them as
 * opaque keys and never rewrites them.
 */

export type StoredThread = {
  id: string;
  title: string | null;
  is_archived: boolean;
  created_at: string;
  last_message_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type StoredMessage = {
  id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  format: string;
  content: Record<string, unknown>;
};

const MessageSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  format: z.string(),
  content: z.record(z.string(), z.unknown()),
});

const ThreadSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  is_archived: z.boolean(),
  created_at: z.string(),
  last_message_at: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const StoreSchema = z.object({
  threads: z.array(ThreadSchema),
  messages: z.record(z.string(), z.array(MessageSchema)),
});

type Store = z.infer<typeof StoreSchema>;

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "threads.json");

const EMPTY_STORE: Store = { threads: [], messages: {} };

function parseStore(raw: string): Store {
  const parsed = StoreSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : EMPTY_STORE;
}

async function readStore(): Promise<Store> {
  try {
    return parseStore(await readFile(STORE_FILE, "utf8"));
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(store), "utf8");
  await rename(tmp, STORE_FILE);
}

/** Serialize all read-modify-write cycles through a single promise chain. */
let writeChain: Promise<unknown> = Promise.resolve();

async function withStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  writeChain = run.catch(() => {});
  return run;
}

const isThreadId = (id: string) => /^[\w-]{1,128}$/.test(id);

export function listThreads(): Promise<StoredThread[]> {
  return readStore().then(({ threads }) =>
    [...threads].sort((a, b) =>
      (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at),
    ),
  );
}

export function createThread(): Promise<StoredThread> {
  return withStore((store) => {
    const now = new Date().toISOString();
    const thread: StoredThread = {
      id: randomUUID(),
      title: null,
      is_archived: false,
      created_at: now,
      last_message_at: now,
      metadata: null,
    };
    store.threads.push(thread);
    store.messages[thread.id] = [];
    return thread;
  });
}

export async function getThread(threadId: string): Promise<StoredThread | null> {
  if (!isThreadId(threadId)) return null;
  const { threads } = await readStore();
  return threads.find((t) => t.id === threadId) ?? null;
}

export function updateThread(
  threadId: string,
  patch: {
    title?: string | null;
    is_archived?: boolean;
    metadata?: Record<string, unknown> | null;
  },
): Promise<StoredThread | null> {
  return withStore((store) => {
    if (!isThreadId(threadId)) return null;
    const thread = store.threads.find((t) => t.id === threadId);
    if (!thread) return null;
    if (patch.title !== undefined) thread.title = patch.title;
    if (patch.is_archived !== undefined) thread.is_archived = patch.is_archived;
    if (patch.metadata !== undefined) thread.metadata = patch.metadata;
    return thread;
  });
}

export function deleteThread(threadId: string): Promise<boolean> {
  return withStore((store) => {
    if (!isThreadId(threadId)) return false;
    const index = store.threads.findIndex((t) => t.id === threadId);
    if (index === -1) return false;
    store.threads.splice(index, 1);
    delete store.messages[threadId];
    return true;
  });
}

export async function listMessages(threadId: string): Promise<StoredMessage[]> {
  if (!isThreadId(threadId)) return [];
  const { messages } = await readStore();
  return [...(messages[threadId] ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function appendMessage(
  threadId: string,
  message: {
    id: string;
    parent_id: string | null;
    format: string;
    content: Record<string, unknown>;
  },
): Promise<StoredMessage | null> {
  return withStore((store) => {
    if (!isThreadId(threadId) || !isThreadId(message.id)) return null;
    const thread = store.threads.find((t) => t.id === threadId);
    if (!thread) return null;
    const now = new Date().toISOString();
    const stored: StoredMessage = {
      id: message.id,
      parent_id: message.parent_id,
      created_at: now,
      updated_at: now,
      format: message.format,
      content: message.content,
    };
    const threadMessages = store.messages[threadId] ?? (store.messages[threadId] = []);
    const existing = threadMessages.findIndex((m) => m.id === stored.id);
    if (existing === -1) {
      threadMessages.push(stored);
    } else {
      threadMessages[existing] = stored;
    }
    thread.last_message_at = now;
    return stored;
  });
}

export function updateMessage(
  threadId: string,
  messageId: string,
  content: Record<string, unknown>,
): Promise<boolean> {
  return withStore((store) => {
    if (!isThreadId(threadId) || !isThreadId(messageId)) return false;
    const message = store.messages[threadId]?.find((m) => m.id === messageId);
    if (!message) return false;
    message.content = content;
    message.updated_at = new Date().toISOString();
    return true;
  });
}

export function deleteMessage(threadId: string, messageId: string): Promise<boolean> {
  return withStore((store) => {
    if (!isThreadId(threadId) || !isThreadId(messageId)) return false;
    const threadMessages = store.messages[threadId];
    if (!threadMessages) return false;
    const index = threadMessages.findIndex((m) => m.id === messageId);
    if (index === -1) return false;
    threadMessages.splice(index, 1);
    return true;
  });
}
