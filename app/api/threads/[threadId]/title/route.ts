import { listMessages, updateThread } from "@/lib/thread-store";
import { createAssistantStreamResponse } from "assistant-stream";
import { z } from "zod";

type RouteContext = { params: Promise<{ threadId: string }> };
const TitleRequestSchema = z.object({ text: z.string().optional() });

function truncateTitle(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > 60 ? `${normalized.slice(0, 57)}…` : normalized;
}

/** Derive a thread title from the first non-empty user text message. */
function deriveTitle(messages: Awaited<ReturnType<typeof listMessages>>): string {
  for (const message of messages) {
    const content = message.content;
    const parts: unknown = (content as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;
    const textPart = parts.find(
      (part): part is { type?: unknown; text?: unknown } =>
        typeof part === "object" && part !== null && (part as { type?: unknown }).type === "text",
    );
    if (textPart && typeof textPart.text === "string" && textPart.text.trim()) {
      return truncateTitle(textPart.text);
    }
  }
  return "New Chat";
}

export async function POST(req: Request, { params }: RouteContext) {
  const { threadId } = await params;
  const body = TitleRequestSchema.safeParse(await req.json().catch(() => ({})));
  const requestText = body.success ? body.data.text?.trim() : undefined;
  const title = requestText
    ? truncateTitle(requestText)
    : deriveTitle(await listMessages(threadId));
  // The runtime only applies the title optimistically; persist it here so
  // it survives a reload.
  await updateThread(threadId, { title });
  return createAssistantStreamResponse((controller) => {
    const writer = controller.addTextPart();
    writer.append(title);
    writer.close();
    controller.close();
  });
}
