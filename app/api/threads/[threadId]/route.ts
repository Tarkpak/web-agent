import { z } from "zod";
import { deleteThread, getThread, updateThread } from "@/lib/thread-store";

const PatchSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  is_archived: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

type RouteContext = { params: Promise<{ threadId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const thread = await getThread(threadId);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });
  return Response.json(thread);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const body = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return Response.json({ error: "Invalid patch body" }, { status: 400 });
  }
  const thread = await updateThread(threadId, body.data);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });
  return Response.json(thread);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const deleted = await deleteThread(threadId);
  if (!deleted) return Response.json({ error: "Thread not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
