import { createThread, listThreads, type StoredThread } from "@/lib/thread-store";

const toWireThread = (thread: StoredThread) => ({
  id: thread.id,
  title: thread.title,
  is_archived: thread.is_archived,
  created_at: thread.created_at,
  last_message_at: thread.last_message_at,
  metadata: thread.metadata,
});

export async function GET() {
  const threads = await listThreads();
  return Response.json({ threads: threads.map(toWireThread) });
}

export async function POST() {
  const thread = await createThread();
  return Response.json({ thread_id: thread.id }, { status: 201 });
}
