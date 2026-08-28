import { mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writePresentation } from "@/lib/presentations";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(300).optional(),
  theme: z.enum(["tech", "light", "dark"]).optional(),
  slides: z
    .array(
      z.object({
        title: z.string().min(1).max(180),
        subtitle: z.string().max(300).optional(),
        body: z.string().max(1200).optional(),
        bullets: z.array(z.string().max(300)).max(6).optional(),
      }),
    )
    .min(1)
    .max(30),
});

function safeFileStem(value: string) {
  const stem = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return stem || "presentation";
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const outputDirectory = path.join(process.cwd(), "generated-files");
    await mkdir(outputDirectory, { recursive: true });

    const suffix = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const fileName = `${safeFileStem(input.title)}-${suffix}.pptx`;
    const outputPath = path.join(outputDirectory, fileName);

    await writePresentation({ ...input, outputPath });

    return NextResponse.json({
      fileName,
      downloadUrl: `/api/files/${encodeURIComponent(fileName)}`,
      slideCount: input.slides.length,
      savedPath: `generated-files/${fileName}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
