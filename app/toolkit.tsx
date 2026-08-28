"use generative";

import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import { defineToolkit, externalTool, humanTool, stubTool } from "@assistant-ui/react";
import { DownloadIcon, FileSlidersIcon } from "lucide-react";
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
  create_presentation: {
    description:
      "Create a real, downloadable PowerPoint (.pptx) file and open a slide preview in the canvas. Use this whenever the user asks for a PPT, PowerPoint, slide deck, or presentation.",
    parameters: z.object({
      title: z.string().describe("Presentation title and output file name"),
      subtitle: z.string().optional().describe("Optional deck subtitle"),
      theme: z
        .enum(["tech", "light", "dark"])
        .optional()
        .describe("Visual theme; use tech for technology topics"),
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
            body={`Creating ${args.slides?.length ?? 0} slides for ${args.title}`}
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
              <Button variant="outline" size="sm" render={<a href={file.downloadUrl} download />}>
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
