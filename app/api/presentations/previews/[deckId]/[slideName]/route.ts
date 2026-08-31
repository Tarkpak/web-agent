import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ deckId: string; slideName: string }> },
) {
  const { deckId, slideName } = await context.params;
  const safeDeckId = decodeURIComponent(deckId);
  const safeSlideName = decodeURIComponent(slideName);
  if (
    safeDeckId !== path.basename(safeDeckId) ||
    safeSlideName !== path.basename(safeSlideName) ||
    !/^slide-\d+\.svg$/i.test(safeSlideName)
  ) {
    return NextResponse.json({ error: "Invalid preview path." }, { status: 400 });
  }
  try {
    const svg = await readFile(
      path.join(process.cwd(), "generated-files", safeDeckId, safeSlideName),
    );
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }
}
