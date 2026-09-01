import { z } from "zod";
import { appendFeedback } from "@/lib/feedback-store";

const FeedbackSchema = z.object({
  messageId: z.string().min(1).max(256),
  type: z.enum(["positive", "negative"]),
  reasons: z.array(z.string().max(80)).max(8).optional(),
  note: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = FeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid feedback" }, { status: 400 });
  }
  const record = await appendFeedback(body.data.messageId, body.data.type, {
    reasons: body.data.reasons,
    note: body.data.note,
  });
  return Response.json({ feedback_id: record.id });
}
