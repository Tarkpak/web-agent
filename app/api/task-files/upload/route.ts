import path from "node:path";
import { NextResponse } from "next/server";
import {
  MAX_TASK_UPLOAD_BYTES,
  normalizeTaskFilePath,
  writeTaskFileBuffer,
} from "@/lib/task-files";

export const runtime = "nodejs";

function safeUploadName(name: string) {
  const base = [...path.basename(name).normalize("NFKC")]
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? "-" : character,
    )
    .join("");
  return base.replace(/^\.+/, "").slice(0, 160) || "attachment";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("A file is required.");
    if (file.size > MAX_TASK_UPLOAD_BYTES) throw new Error("Uploads are limited to 10 MB.");
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const relativePath = normalizeTaskFilePath(`uploads/${timestamp}-${safeUploadName(file.name)}`);
    const saved = await writeTaskFileBuffer(relativePath, new Uint8Array(await file.arrayBuffer()));
    const query = new URLSearchParams({ path: saved.path });
    return NextResponse.json({
      ...saved,
      name: file.name,
      downloadUrl: `/api/task-files/content?${query}`,
      previewUrl: `/api/task-files/content?${query}&inline=1`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save attachment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
