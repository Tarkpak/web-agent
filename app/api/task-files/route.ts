import { NextResponse } from "next/server";
import { z } from "zod";
import { listTaskFiles, readTaskFile, writeTaskFile } from "@/lib/task-files";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), path: z.string().max(500).optional() }),
  z.object({ action: z.literal("read"), path: z.string().min(1).max(500) }),
  z.object({
    action: z.literal("write"),
    path: z.string().min(1).max(500),
    content: z.string().max(2 * 1024 * 1024),
  }),
]);

function downloadUrl(filePath: string, inline = false) {
  const query = new URLSearchParams({ path: filePath });
  if (inline) query.set("inline", "1");
  return `/api/task-files/content?${query}`;
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    if (input.action === "list") {
      return NextResponse.json({ files: await listTaskFiles(input.path) });
    }
    const file =
      input.action === "read"
        ? await readTaskFile(input.path)
        : await writeTaskFile(input.path, input.content);
    return NextResponse.json({
      ...file,
      downloadUrl: downloadUrl(file.path),
      previewUrl: downloadUrl(file.path, true),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task file operation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
