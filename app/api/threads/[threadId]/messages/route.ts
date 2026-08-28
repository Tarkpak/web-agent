import { z } from "zod";
import { appendMessage, listMessages } from "@/lib/thread-store";

const AppendSchema = z.object({
  id: z.string().min(1).max(128),
  parent_id: z.string().min(1).max(128).nullable(),
  format: z.string().min(1).max(64),
  content: z.record(z.string(), z.unknown()),
});

type RouteContext = { params: Promise<{ threadId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const messages = await listMessages(threadId);
  return Response.json({ messages });
}

export async function POST(req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const body = AppendSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return Response.json({ error: "Invalid message body" }, { status: 400 });
  }
  const stored = await appendMessage(threadId, body.data);
  if (!stored) return Response.json({ error: "Thread not found" }, { status: 404 });
  return Response.json({ message_id: stored.id }, { status: 201 });
}
