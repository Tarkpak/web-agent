import path from "node:path";
import { NextResponse } from "next/server";
import { importPresentationTemplate } from "@/lib/presentation-template-import";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("A PowerPoint file is required.");
    const result = await importPresentationTemplate({
      buffer: Buffer.from(await file.arrayBuffer()),
      sourceName: file.name,
      outputRoot: path.join(process.cwd(), "generated-files", "template-assets"),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not import the PowerPoint template.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
