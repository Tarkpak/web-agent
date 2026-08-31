import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ templateId: string; assetId: string }> },
) {
  const { templateId, assetId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(templateId) || !/^asset-\d+\.(png|jpg|gif)$/i.test(assetId)) {
    return NextResponse.json({ error: "Invalid template asset path." }, { status: 400 });
  }
  try {
    const file = await readFile(
      path.join(process.cwd(), "generated-files", "template-assets", templateId, assetId),
    );
    return new Response(file, {
      headers: {
        "Content-Type": MIME_TYPES[path.extname(assetId).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Template asset not found." }, { status: 404 });
  }
}
