import { z } from "zod";
import { deleteMessage, updateMessage } from "@/lib/thread-store";

const UpdateSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

type RouteContext = { params: Promise<{ threadId: string; messageId: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
  const { threadId, messageId } = await params;
  const body = UpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return Response.json({ error: "Invalid message body" }, { status: 400 });
  }
  const updated = await updateMessage(threadId, messageId, body.data.content);
  if (!updated) return Response.json({ error: "Message not found" }, { status: 404 });
  return Response.json({ message_id: messageId });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { threadId, messageId } = await params;
  const deleted = await deleteMessage(threadId, messageId);
  if (!deleted) return Response.json({ error: "Message not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
