import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { renderPresentationSlide, writePresentation } from "@/lib/presentations";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(300).optional(),
  theme: z.enum(["tech", "light", "dark"]).optional(),
  design: z.object({
    name: z.string().max(80), mood: z.string().max(160), rationale: z.string().max(400),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    typography: z.enum(["modern", "editorial", "technical", "friendly"]),
    composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
    density: z.enum(["airy", "balanced", "dense"]),
  }).optional(),
  slides: z
    .array(
      z.object({
        title: z.string().min(1).max(180),
        subtitle: z.string().max(300).optional(),
        body: z.string().max(1200).optional(),
        bullets: z.array(z.string().max(300)).max(6).optional(),
        layout: z.enum(["cover", "statement", "split", "list", "comparison", "timeline", "quote", "closing"]).optional(),
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
    const previewDirectoryName = fileName.replace(/\.pptx$/i, "");
    const previewDirectory = path.join(outputDirectory, previewDirectoryName);
    await mkdir(previewDirectory, { recursive: true });
    const previewUrls = await Promise.all(
      input.slides.map(async (slide, index) => {
        const previewName = `slide-${index + 1}.svg`;
        const svg = renderPresentationSlide({
          deckTitle: input.title,
          deckSubtitle: input.subtitle,
          theme: input.theme,
          design: input.design,
          slide,
          index,
        });
        await writeFile(path.join(previewDirectory, previewName), svg, "utf8");
        return `/api/presentations/previews/${encodeURIComponent(previewDirectoryName)}/${previewName}`;
      }),
    );

    return NextResponse.json({
      fileName,
      downloadUrl: `/api/files/${encodeURIComponent(fileName)}`,
      slideCount: input.slides.length,
      savedPath: `generated-files/${fileName}`,
      previewUrls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
