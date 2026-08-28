import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await context.params;
  const decodedName = decodeURIComponent(fileName);

  if (decodedName !== path.basename(decodedName) || !decodedName.toLowerCase().endsWith(".pptx")) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), "generated-files", decodedName));
    return new Response(file, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(decodedName)}`,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Generated file not found." }, { status: 404 });
  }
}
