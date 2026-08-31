import { NextResponse } from "next/server";
import { readTaskFileBuffer } from "@/lib/task-files";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const file = await readTaskFileBuffer(url.searchParams.get("path") ?? "");
    const disposition = url.searchParams.get("inline") === "1" ? "inline" : "attachment";
    return new Response(file.data, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Content-Length": String(file.data.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Task file not found." }, { status: 404 });
  }
}
