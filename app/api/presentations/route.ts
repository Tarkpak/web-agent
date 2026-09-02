import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { renderPresentationSlide, writePresentation } from "@/lib/presentations";
import { resolvePresentationTemplate } from "@/lib/presentation-templates";
import { assessPresentation, orchestratePresentation } from "@/lib/presentation-orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(300).optional(),
  theme: z.enum(["tech", "light", "dark"]).optional(),
  layoutMode: z.enum(["auto", "preserve"]).default("auto"),
  design: z
    .object({
      name: z.string().max(80),
      mood: z.string().max(160),
      rationale: z.string().max(400),
      narrativeMode: z
        .enum(["pyramid", "narrative", "instructional", "showcase", "briefing", "custom"])
        .optional(),
      narrativeBehavior: z.string().max(500).optional(),
      visualStyle: z.string().max(80).optional(),
      visualBehavior: z.string().max(500).optional(),
      imageStrategy: z
        .enum(["none", "photography", "illustration", "mixed", "data-led"])
        .optional(),
      compositionRule: z.string().max(400).optional(),
      typographyRule: z.string().max(400).optional(),
      recurringMotif: z.string().max(300).optional(),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      typography: z.enum(["modern", "editorial", "technical", "friendly"]),
      composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
      density: z.enum(["airy", "balanced", "dense"]),
    })
    .optional(),
  brand: z
    .object({
      name: z.string().max(80).optional(),
      logoText: z.string().max(40).optional(),
      titleFont: z.string().max(80).optional(),
      bodyFont: z.string().max(80).optional(),
      footer: z.string().max(120).optional(),
      background: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      foreground: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      muted: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      accent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      secondary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    })
    .optional(),
  masterProfile: z
    .object({
      id: z.uuid(),
      sourceName: z.string().max(160),
      slideSize: z.object({ width: z.number().positive(), height: z.number().positive() }),
      masterNames: z.array(z.string().max(160)).max(20),
      layoutNames: z.array(z.string().max(160)).max(100),
      colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(24),
      fonts: z.object({
        major: z.string().max(80).optional(),
        minor: z.string().max(80).optional(),
      }),
      assetCount: z.number().int().min(0).max(100),
      decorations: z
        .array(
          z.discriminatedUnion("kind", [
            z.object({
              kind: z.enum(["rect", "ellipse"]),
              x: z.number(),
              y: z.number(),
              width: z.number().positive(),
              height: z.number().positive(),
              color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
              opacity: z.number().min(0).max(1).optional(),
            }),
            z.object({
              kind: z.literal("line"),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
              color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
              opacity: z.number().min(0).max(1).optional(),
              lineWidth: z.number().positive().max(20).optional(),
            }),
            z.object({
              kind: z.literal("text"),
              value: z.string().max(500),
              x: z.number(),
              y: z.number(),
              width: z.number().positive(),
              height: z.number().positive(),
              fontSize: z.number().positive().max(200),
              color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
              fontFamily: z.string().max(80),
              weight: z.number().min(100).max(900),
              align: z.enum(["left", "center", "right"]).optional(),
            }),
            z.object({
              kind: z.literal("image"),
              x: z.number(),
              y: z.number(),
              width: z.number().positive(),
              height: z.number().positive(),
              assetId: z.string().regex(/^asset-\d+\.(png|jpg|gif)$/i),
              assetUrl: z
                .string()
                .regex(
                  /^\/api\/presentations\/templates\/assets\/[0-9a-f-]{36}\/asset-\d+\.(png|jpg|gif)$/i,
                ),
            }),
          ]),
        )
        .max(200),
      warnings: z.array(z.string().max(300)).max(50),
    })
    .optional(),
  slides: z
    .array(
      z.object({
        title: z.string().min(1).max(180),
        subtitle: z.string().max(300).optional(),
        body: z.string().max(1200).optional(),
        bullets: z
          .array(z.string().max(300))
          .max(30)
          .optional()
          .describe("Dense input is accepted here and split to fit by the orchestrator."),
        layout: z
          .enum([
            "cover",
            "statement",
            "split",
            "list",
            "comparison",
            "timeline",
            "quote",
            "closing",
            "chart",
            "table",
          ])
          .optional(),
        templateId: z
          .enum([
            "cover-accent-rail",
            "statement-focus",
            "split-narrative-list",
            "numbered-list",
            "two-column-comparison",
            "milestone-timeline",
            "editorial-quote",
            "closing-halo",
            "data-chart",
            "data-table",
          ])
          .optional(),
        section: z.string().max(120).optional(),
        layoutReason: z.string().max(300).optional(),
        layoutAlternatives: z
          .array(
            z.enum([
              "cover",
              "statement",
              "split",
              "list",
              "comparison",
              "timeline",
              "quote",
              "closing",
              "chart",
              "table",
            ]),
          )
          .max(4)
          .optional(),
        chart: z
          .object({
            type: z.enum(["bar", "line", "pie"]),
            categories: z.array(z.string().max(80)).min(1).max(12),
            series: z
              .array(
                z.object({
                  name: z.string().max(80),
                  values: z.array(z.number().finite()).min(1).max(12),
                }),
              )
              .min(1)
              .max(6),
          })
          .optional(),
        table: z
          .object({
            headers: z.array(z.string().max(120)).min(1).max(6),
            rows: z.array(z.array(z.string().max(240)).max(6)).max(8),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(40),
});

function safeFileStem(value: string) {
  const withoutControlCharacters = Array.from(value, (character) =>
    (character.codePointAt(0) ?? 0) < 0x20 ? "-" : character,
  ).join("");
  const stem = withoutControlCharacters
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return stem || "presentation";
}

const PLACEHOLDER_DATA_PATTERN =
  /^(?:placeholder|sample|example|demo|test|tbd|n\/a|unknown|待补充|待填写|示例|占位|测试)$/i;

function hasMeaningfulChartData(slide: z.infer<typeof requestSchema>["slides"][number]) {
  if (!slide.chart) return false;
  const labels = [
    ...slide.chart.categories,
    ...slide.chart.series.map((series) => series.name),
  ].map((value) => value.trim());
  const values = slide.chart.series.flatMap((series) => series.values);
  return (
    labels.some((label) => label && !PLACEHOLDER_DATA_PATTERN.test(label)) &&
    values.some((value) => Number.isFinite(value) && value !== 0)
  );
}

function hasMeaningfulTableData(slide: z.infer<typeof requestSchema>["slides"][number]) {
  if (!slide.table || slide.table.headers.length < 2 || slide.table.rows.length === 0) return false;
  const cells = [...slide.table.headers, ...slide.table.rows.flat()].map((value) => value.trim());
  return cells.every((cell) => cell && !PLACEHOLDER_DATA_PATTERN.test(cell));
}

function normalizeAutoLayoutSlides(input: z.infer<typeof requestSchema>) {
  if (input.layoutMode !== "auto") return input.slides;
  return input.slides.map((slide, index) => {
    const discardChart = index === 0 || (slide.chart && !hasMeaningfulChartData(slide));
    const discardTable = index === 0 || (slide.table && !hasMeaningfulTableData(slide));
    if (!discardChart && !discardTable) return slide;
    const { chart: _chart, table: _table, ...contentSlide } = slide;
    const hasSupportingContent = Boolean(
      contentSlide.body?.trim() || contentSlide.bullets?.some((bullet) => bullet.trim()),
    );
    return {
      ...contentSlide,
      body:
        !hasSupportingContent && index > 0
          ? contentSlide.subtitle?.trim() || undefined
          : contentSlide.body,
      subtitle: !hasSupportingContent && index > 0 ? undefined : contentSlide.subtitle,
      layout:
        contentSlide.layout === "chart" || contentSlide.layout === "table"
          ? index === 0
            ? "cover"
            : !hasSupportingContent
              ? "statement"
              : undefined
          : contentSlide.layout,
      templateId:
        contentSlide.templateId === "data-chart" || contentSlide.templateId === "data-table"
          ? undefined
          : contentSlide.templateId,
    };
  });
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const stream = new URL(request.url).searchParams.get("stream") === "1";
    const encoder = new TextEncoder();

    const build = async (emit?: (event: Record<string, unknown>) => void) => {
      const normalizedSlides = normalizeAutoLayoutSlides(input);
      const orchestration =
        input.layoutMode === "auto"
          ? orchestratePresentation(normalizedSlides, input.design)
          : null;
      const arrangedSlides = orchestration?.slides ?? normalizedSlides;
      const narrativeQuality =
        orchestration?.narrativeQuality ?? assessPresentation(arrangedSlides);
      arrangedSlides.forEach((slide, index) => {
        const layout = slide.layout ?? (index === 0 ? "cover" : "split");
        if (
          slide.templateId &&
          resolvePresentationTemplate(layout, slide.templateId).id !== slide.templateId
        ) {
          throw new Error(`Slide ${index + 1} template does not match its layout.`);
        }
        if (layout === "chart" && !slide.chart)
          throw new Error(`Slide ${index + 1} requires chart data.`);
        if (layout === "table" && !slide.table)
          throw new Error(`Slide ${index + 1} requires table data.`);
        if (
          slide.chart &&
          slide.chart.series.some(
            (series) => series.values.length !== slide.chart!.categories.length,
          )
        ) {
          throw new Error(`Slide ${index + 1} chart series must match the category count.`);
        }
        if (slide.chart?.type === "pie" && slide.chart.series.length !== 1) {
          throw new Error(`Slide ${index + 1} pie chart requires exactly one series.`);
        }
        if (
          slide.table &&
          slide.table.rows.some((row) => row.length !== slide.table!.headers.length)
        ) {
          throw new Error(`Slide ${index + 1} table rows must match the header count.`);
        }
      });
      emit?.({
        type: "stage",
        stage: "layout",
        stageIndex: 0,
        progress: 1,
        message: `Arranged ${arrangedSlides.length} slides within layout capacity`,
        slides: arrangedSlides,
      });
      emit?.({
        type: "stage",
        stage: "preview",
        stageIndex: 1,
        progress: 0,
        message: `Rendering 0 of ${arrangedSlides.length} slide previews`,
        slides: arrangedSlides,
      });
      const outputDirectory = path.join(process.cwd(), "generated-files");
      await mkdir(outputDirectory, { recursive: true });

      const suffix = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
      const fileName = `${safeFileStem(input.title)}-${suffix}.pptx`;
      const outputPath = path.join(outputDirectory, fileName);

      if (
        input.masterProfile &&
        input.masterProfile.decorations.some(
          (decoration) =>
            decoration.kind === "image" &&
            !decoration.assetUrl.includes(`/${input.masterProfile!.id}/`),
        )
      ) {
        throw new Error("The imported template asset does not match its template identifier.");
      }
      const previewDirectoryName = fileName.replace(/\.pptx$/i, "");
      const previewDirectory = path.join(outputDirectory, previewDirectoryName);
      await mkdir(previewDirectory, { recursive: true });
      const previewUrls: string[] = [];
      for (const [index, slide] of arrangedSlides.entries()) {
        const previewName = `slide-${index + 1}.svg`;
        const svg = renderPresentationSlide({
          deckTitle: input.title,
          deckSubtitle: input.subtitle,
          theme: input.theme,
          design: input.design,
          brand: input.brand,
          masterProfile: input.masterProfile,
          slide,
          index,
        });
        await writeFile(path.join(previewDirectory, previewName), svg, "utf8");
        const previewUrl = `/api/presentations/previews/${encodeURIComponent(previewDirectoryName)}/${previewName}`;
        previewUrls.push(previewUrl);
        emit?.({
          type: "preview",
          stage: "preview",
          stageIndex: 1,
          progress: previewUrls.length / arrangedSlides.length,
          message: `Rendered ${previewUrls.length} of ${arrangedSlides.length} slide previews`,
          index,
          previewUrl,
        });
      }

      emit?.({
        type: "stage",
        stage: "export",
        stageIndex: 2,
        progress: 0,
        message: "Writing the editable PowerPoint file",
      });
      const quality = await writePresentation({ ...input, slides: arrangedSlides, outputPath });
      emit?.({
        type: "stage",
        stage: "verify",
        stageIndex: 3,
        progress: 0,
        message: "Checking layout quality and finalizing the file",
      });

      const result = {
        fileName,
        downloadUrl: `/api/files/${encodeURIComponent(fileName)}`,
        slideCount: arrangedSlides.length,
        slides: arrangedSlides,
        savedPath: `generated-files/${fileName}`,
        previewUrls,
        quality: { ...quality, narrative: narrativeQuality },
      };
      emit?.({ type: "complete", stage: "verify", stageIndex: 4, progress: 1, result });
      return result;
    };

    if (!stream) return NextResponse.json(await build());

    return new Response(
      new ReadableStream({
        async start(controller) {
          const emit = (event: Record<string, unknown>) =>
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          try {
            await build(emit);
          } catch (error) {
            emit({
              type: "error",
              error: error instanceof Error ? error.message : "Could not create presentation.",
            });
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create presentation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
