"use generative";

import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import { defineToolkit, externalTool, humanTool, stubTool } from "@assistant-ui/react";
import { CheckIcon, DownloadIcon, FilePenLineIcon, FileSlidersIcon, FolderOpenIcon, SparklesIcon } from "lucide-react";
import { z } from "zod";

function ToolCard({
  title,
  body,
  tone = "idle",
}: {
  title: string;
  body: string;
  tone?: "idle" | "ok" | "wait";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "wait"
        ? "border-border/80 bg-muted/40"
        : "border-border/60 bg-card";
  return (
    <div className={`my-2 rounded-xl border px-3 py-2 text-sm ${toneClass}`}>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {title}
      </p>
      <p className="mt-1 whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function GeneratedImage({
  alt,
  dataUrl,
  generating = false,
}: {
  alt: string;
  dataUrl?: string;
  generating?: boolean;
}) {
  if (generating) {
    return (
      <Image.Root className="my-2" size="lg">
        <Image.Generating />
      </Image.Root>
    );
  }

  if (!dataUrl) {
    return <Image.ContentFilterError reason="No image was returned by the provider." />;
  }

  const part = { type: "image" as const, image: dataUrl };
  return (
    <Image.Root className="my-2" size="lg">
      <Image.Zoom src={dataUrl} alt={alt}>
        <Image.Preview src={dataUrl} alt={alt} />
      </Image.Zoom>
      <Image.Actions part={part} />
    </Image.Root>
  );
}

export default defineToolkit({
  web_search: {
    parameters: z.object({
      query: z.string().optional(),
    }),
    execute: externalTool(),
    render: ({ args, result, status }) => {
      const query = args.query ?? "the web";
      if (status.type === "running") {
        return <ToolCard title="Web search" body={`Searching ${query}`} tone="wait" />;
      }
      const sources =
        result && typeof result === "object" && "sources" in result
          ? (result.sources as Array<{ url?: string }>)
          : [];
      const count = Array.isArray(sources) ? sources.length : 0;
      return (
        <ToolCard
          title="Web search"
          body={count > 0 ? `Found ${count} sources for ${query}` : `Finished search for ${query}`}
          tone="ok"
        />
      );
    },
  },
  x_search: {
    parameters: z.object({
      query: z.string().optional(),
    }),
    execute: externalTool(),
    render: ({ args, status }) => (
      <ToolCard
        title="X search"
        body={
          status.type === "running"
            ? `Searching X for ${args.query ?? "posts"}`
            : `Finished X search for ${args.query ?? "posts"}`
        }
        tone={status.type === "running" ? "wait" : "ok"}
      />
    ),
  },
  code_execution: {
    parameters: z.object({}),
    execute: externalTool(),
    render: ({ result, status }) => {
      if (status.type === "running") {
        return <ToolCard title="Code" body="Running code" tone="wait" />;
      }
      const output =
        result && typeof result === "object" && "output" in result
          ? String((result as { output: string }).output)
          : "Done";
      return <ToolCard title="Code" body={output.slice(0, 800)} tone="ok" />;
    },
  },
  get_current_time: {
    description: "Get the current date and time in ISO format.",
    parameters: z.object({
      timezone: z
        .string()
        .optional()
        .describe("IANA timezone such as Asia/Shanghai. Defaults to UTC."),
    }),
    execute: async ({ timezone }) => {
      const now = new Date();
      const zone = timezone || "UTC";
      try {
        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          dateStyle: "full",
          timeStyle: "long",
        }).format(now);
        return { iso: now.toISOString(), timezone: zone, formatted };
      } catch {
        return { iso: now.toISOString(), timezone: "UTC", formatted: now.toISOString() };
      }
    },
    render: ({ result, status }) => (
      <ToolCard
        title="Time"
        body={
          status.type === "running" ? "Reading clock" : (result?.formatted ?? result?.iso ?? "Done")
        }
        tone={status.type === "running" ? "wait" : "ok"}
      />
    ),
  },
  present_artifact: {
    description:
      "Open a markdown document, HTML page, or code file in the right-hand canvas so the user can inspect it.",
    parameters: z.object({
      title: z.string().describe("Short canvas title"),
      kind: z.enum(["markdown", "html", "code"]),
      language: z.string().optional().describe("Highlight language when kind is code"),
      content: z.string().describe("Full artifact contents"),
    }),
    execute: stubTool(),
    render: ({ args, status }) => (
      <ToolCard
        title="Canvas"
        body={
          status.type === "running"
            ? `Opening ${args.title}`
            : `Opened ${args.title} (${args.kind})`
        }
        tone={status.type === "running" ? "wait" : "ok"}
      />
    ),
  },
  list_files: {
    description:
      "List files in the restricted task workspace. Use this to discover files created during the task.",
    parameters: z.object({
      path: z.string().optional().describe("Optional relative directory inside the task workspace"),
    }),
    execute: stubTool(),
    render: ({ args, result, status }) => {
      const files = (result as { files?: Array<{ path: string; size: number }> } | undefined)
        ?.files;
      return (
        <ToolCard
          title="Task files"
          body={
            status.type === "running"
              ? `Listing ${args.path || "workspace"}`
              : files?.length
                ? files
                    .slice(0, 12)
                    .map((file) => `${file.path} (${file.size} bytes)`)
                    .join("\n")
                : "No task files found"
          }
          tone={status.type === "running" ? "wait" : "ok"}
        />
      );
    },
  },
  read_file: {
    display: "standalone",
    description:
      "Read a file from the restricted task workspace and open it in the canvas. Text files return their content; images, PDFs, and binary files return preview/download URLs.",
    parameters: z.object({
      path: z.string().describe("Relative path inside the task workspace"),
    }),
    execute: stubTool(),
    render: ({ args, result, status }) => {
      const file = result as { path?: string; size?: number; downloadUrl?: string } | undefined;
      return (
        <div className="border-border/60 bg-card my-2 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
          <FolderOpenIcon className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file?.path ?? args.path}</p>
            <p className="text-muted-foreground text-xs">
              {status.type === "running"
                ? "Opening file"
                : `${file?.size ?? 0} bytes · Opened in canvas`}
            </p>
          </div>
          {file?.downloadUrl ? (
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<a href={file.downloadUrl} download />}
            >
              <DownloadIcon />
              <span className="sr-only">Download file</span>
            </Button>
          ) : null}
        </div>
      );
    },
  },
  write_file: {
    display: "standalone",
    description:
      "Create or overwrite a UTF-8 text file in the restricted task workspace and open it in the canvas. Use relative paths only.",
    parameters: z.object({
      path: z.string().describe("Relative output path, including the file extension"),
      content: z.string().describe("Complete UTF-8 file contents"),
    }),
    execute: stubTool(),
    render: ({ args, result, status }) => {
      const file = result as { path?: string; size?: number; downloadUrl?: string } | undefined;
      return (
        <div className="border-border/60 bg-card my-2 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
          <FilePenLineIcon className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file?.path ?? args.path}</p>
            <p className="text-muted-foreground text-xs">
              {status.type === "running"
                ? "Writing file"
                : `${file?.size ?? 0} bytes · Saved and opened`}
            </p>
          </div>
          {file?.downloadUrl ? (
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<a href={file.downloadUrl} download />}
            >
              <DownloadIcon />
              <span className="sr-only">Download file</span>
            </Button>
          ) : null}
        </div>
      );
    },
  },
  choose_presentation_style: {
    description:
      "Pause before creating a new presentation and let the user choose one of three AI-generated visual directions. Each direction must be tailored to this specific topic, audience, and purpose, and materially differ in palette, typography, composition, and density. Use this exactly once before create_presentation unless the user already supplied a clear visual direction or asked you to choose for them.",
    parameters: z.object({
      designRead: z.string().describe("One concise sentence explaining the inferred audience, purpose, and visual need"),
      options: z.array(z.object({
        id: z.string(),
        name: z.string().describe("Short evocative direction name, not a generic template label"),
        mood: z.string().describe("Three or four plain-language mood words"),
        rationale: z.string().describe("Why this direction fits the user's topic and audience"),
        background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        typography: z.enum(["modern", "editorial", "technical", "friendly"]),
        composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
        density: z.enum(["airy", "balanced", "dense"]),
        recommended: z.boolean().optional(),
      })).length(3),
    }),
    execute: humanTool(),
    render: ({ args, result, addResult }) => {
      const options = args.options ?? [];
      const selected = result && typeof result === "object" && "selected" in result
        ? String((result as { selected: string }).selected)
        : null;
      if (selected) {
        const option = options.find((item) => item.id === selected);
        return <ToolCard title="Visual direction" body={`Selected ${option?.name ?? selected}`} tone="ok" />;
      }
      if (options.length < 3) {
        return <ToolCard title="Visual direction" body="Analyzing the brief and composing three tailored directions" tone="wait" />;
      }
      return (
        <div className="border-border/60 bg-card my-3 overflow-hidden rounded-lg border">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><SparklesIcon className="size-4 text-primary" />Choose a look</div>
            <p className="text-muted-foreground mt-1 text-xs leading-5">{args.designRead || "Three directions tailored to this presentation"}</p>
          </div>
          <div className="grid gap-2 p-3 lg:grid-cols-3">
            {options.map((option) => (
              <button key={option.id} type="button" onClick={() => addResult({ selected: option.id, design: option })} className="group overflow-hidden rounded-md border text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md active:translate-y-0">
                <div className="relative aspect-[16/7] overflow-hidden p-3" style={{ backgroundColor: option.background, color: option.foreground }}>
                  <div className="h-1 w-10" style={{ backgroundColor: option.accent }} />
                  <div className="mt-5 max-w-[80%] text-base font-semibold leading-tight">{option.name}</div>
                  <div className="absolute right-3 bottom-3 flex gap-1">
                    {[option.foreground, option.muted, option.accent, option.secondary].map((color, colorIndex) => <span key={`${color}-${colorIndex}`} className="size-3 rounded-full outline outline-black/10" style={{ backgroundColor: color }} />)}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{option.name}</span>{option.recommended ? <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckIcon className="size-3" />Best fit</span> : null}</div>
                  <p className="text-muted-foreground mt-1 text-[11px]">{option.mood}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5">{option.rationale}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    },
  },
  create_presentation: {
    description:
      "Create a real, downloadable PowerPoint (.pptx), automatically select capacity-safe layouts, split dense pages, score deck-level narrative quality, and open the result in the editor.",
    parameters: z.object({
      title: z.string().describe("Presentation title and output file name"),
      subtitle: z.string().optional().describe("Optional deck subtitle"),
      theme: z
        .enum(["tech", "light", "dark"])
        .optional()
        .describe("Visual theme; use tech for technology topics"),
      design: z.object({
        name: z.string(), mood: z.string(), rationale: z.string(),
        background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        typography: z.enum(["modern", "editorial", "technical", "friendly"]),
        composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
        density: z.enum(["airy", "balanced", "dense"]),
      }).optional().describe("The exact visual direction selected by the user"),
      brand: z.object({
        name: z.string().optional(),
        logoText: z.string().optional(),
        titleFont: z.string().optional(),
        bodyFont: z.string().optional(),
        footer: z.string().optional(),
        background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }).optional().describe("Brand settings explicitly supplied by the user"),
      slides: z
        .array(
          z.object({
            title: z.string().describe("Slide title"),
            subtitle: z.string().optional().describe("Short supporting line"),
            body: z.string().optional().describe("Short paragraph, preferably under 60 words"),
            bullets: z
              .array(z.string())
              .optional()
              .describe("Up to five concise audience-facing bullet points"),
            layout: z.enum(["cover", "statement", "split", "list", "comparison", "timeline", "quote", "closing", "chart", "table"]).optional().describe("Optional layout hint; the orchestrator validates semantic fit and capacity"),
            templateId: z.enum(["cover-accent-rail", "statement-focus", "split-narrative-list", "numbered-list", "two-column-comparison", "milestone-timeline", "editorial-quote", "closing-halo", "data-chart", "data-table"]).optional(),
            chart: z.object({
              type: z.enum(["bar", "line", "pie"]),
              categories: z.array(z.string()).min(1).max(12),
              series: z.array(z.object({ name: z.string(), values: z.array(z.number()).min(1).max(12) })).min(1).max(6),
            }).optional().describe("Traceable chart data supplied by the user"),
            table: z.object({
              headers: z.array(z.string()).min(1).max(6),
              rows: z.array(z.array(z.string()).max(6)).max(8),
            }).optional().describe("Traceable tabular data supplied by the user"),
          }),
        )
        .min(1)
        .max(30)
        .describe("All slides in order, including the title slide"),
    }),
    execute: stubTool(),
    render: ({ args, result, status }) => {
      const file = result as
        | { fileName?: string; downloadUrl?: string; slideCount?: number; error?: string }
        | undefined;

      if (status.type === "running") {
        return (
          <ToolCard
            title="Presentation"
            body={`Opening the editor and building ${args.slides?.length ?? 0} slides for ${args.title}`}
            tone="wait"
          />
        );
      }

      if (file?.error) {
        return <ToolCard title="Presentation" body={file.error} />;
      }

      return (
        <div className="border-border/60 bg-card my-2 rounded-lg border px-3 py-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <FileSlidersIcon className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file?.fileName ?? `${args.title}.pptx`}</p>
              <p className="text-muted-foreground text-xs">
                {file?.slideCount ?? args.slides?.length ?? 0} slides · PowerPoint
              </p>
            </div>
            {file?.downloadUrl ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={file.downloadUrl} download />}
              >
                <DownloadIcon />
                Download
              </Button>
            ) : null}
          </div>
        </div>
      );
    },
  },
  generate_image: {
    display: "standalone",
    parameters: z.object({
      prompt: z.string().optional(),
      size: z.string().optional(),
    }),
    execute: externalTool(),
    render: ({ args, result, status }) => {
      if (status.type === "running") {
        return <GeneratedImage alt={args.prompt ?? "Generated image"} generating />;
      }
      const dataUrl =
        result && typeof result === "object" && "dataUrl" in result
          ? String((result as { dataUrl?: string }).dataUrl || "")
          : "";
      if (!dataUrl) {
        return <GeneratedImage alt={args.prompt ?? "Generated image"} />;
      }
      return <GeneratedImage alt={args.prompt || "Generated image"} dataUrl={dataUrl} />;
    },
  },
  edit_image: {
    display: "standalone",
    parameters: z.object({
      prompt: z.string().optional(),
      size: z.string().optional(),
    }),
    execute: externalTool(),
    render: ({ args, result, status }) => {
      if (status.type === "running") {
        return <GeneratedImage alt={args.prompt ?? "Edited image"} generating />;
      }
      const dataUrl =
        result && typeof result === "object" && "dataUrl" in result
          ? String((result as { dataUrl?: string }).dataUrl || "")
          : "";
      if (!dataUrl) {
        return <GeneratedImage alt={args.prompt ?? "Edited image"} />;
      }
      return <GeneratedImage alt={args.prompt || "Edited image"} dataUrl={dataUrl} />;
    },
  },
  confirm_plan: {
    description:
      "Pause and ask the user to approve a plan before continuing with multi-step or destructive work.",
    parameters: z.object({
      summary: z.string(),
      steps: z.array(z.string()).describe("Ordered steps to approve"),
    }),
    execute: humanTool(),
    render: ({ args, result, addResult }) => {
      if (result) {
        return (
          <ToolCard
            title="Plan"
            body={
              result.approved ? "Approved. Continuing." : "Rejected. Waiting for a new direction."
            }
            tone={result.approved ? "ok" : "idle"}
          />
        );
      }
      return (
        <div className="border-border/60 bg-card my-2 rounded-xl border px-3 py-3 text-sm">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Approve plan
          </p>
          <p className="mt-1 font-medium">{args.summary}</p>
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 ps-5">
            {args.steps?.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={() => addResult({ approved: true })}>
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addResult({ approved: false })}
            >
              Reject
            </Button>
          </div>
        </div>
      );
    },
  },
});
