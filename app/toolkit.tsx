"use generative";

import { ImageGeneration } from "@/components/assistant-ui/elements/image-generation";
import { ApprovalCard } from "@/components/assistant-ui/elements/approval-card";
import { ArtifactCard } from "@/components/assistant-ui/elements/artifact-card";
import { FileCard } from "@/components/assistant-ui/elements/file-card";
import { buildFileTree, FileTree } from "@/components/assistant-ui/elements/file-tree";
import { TerminalBlock } from "@/components/assistant-ui/elements/terminal-block";
import { ToolError } from "@/components/assistant-ui/elements/tool-error";
import { WebSearch, type WebSearchResult } from "@/components/assistant-ui/elements/web-search";
import { ComparisonCard } from "@/components/assistant-ui/elements/comparison-card";
import {
  RecommendationChoices,
  type VisualDirection,
} from "@/components/assistant-ui/elements/recommendation-card";
import { GenerationLoader } from "@/components/assistant-ui/elements/loading-state";
import { Image } from "@/components/assistant-ui/elements/image";
import { defineToolkit, externalTool, humanTool, stubTool } from "@assistant-ui/react";
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
  error,
}: {
  alt: string;
  dataUrl?: string;
  generating?: boolean;
  error?: string;
}) {
  if (generating) {
    return <ImageGeneration className="my-2" prompt={alt} generating />;
  }

  if (error) {
    return <ToolError name="Image generation" target={alt} message={error} />;
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
      const record =
        result && typeof result === "object" ? (result as Record<string, unknown>) : {};
      const action =
        record.action && typeof record.action === "object"
          ? (record.action as Record<string, unknown>)
          : {};
      const actionQueries = Array.isArray(action.queries)
        ? action.queries.filter((query): query is string => typeof query === "string")
        : [];
      const query =
        args.query ??
        (actionQueries.length > 0 ? actionQueries.join(", ") : undefined) ??
        (typeof action.query === "string" ? action.query : undefined) ??
        "the web";
      if (status.type === "incomplete" && status.reason === "error") {
        return (
          <ToolError
            name="Web search"
            target={query}
            message={"error" in status ? String(status.error || "Search failed") : "Search failed"}
          />
        );
      }
      const raw = Array.isArray(record.results)
        ? record.results
        : Array.isArray(record.sources)
          ? record.sources
          : [];
      const results = raw.flatMap<WebSearchResult>((item) => {
        if (!item || typeof item !== "object") return [];
        const source = item as Record<string, unknown>;
        const url = typeof source.url === "string" ? source.url : undefined;
        let domain = typeof source.domain === "string" ? source.domain : "";
        if (!domain && url) {
          try {
            domain = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            domain = url;
          }
        }
        const title = typeof source.title === "string" ? source.title : domain;
        return domain ? [{ title, domain, url }] : [];
      });
      return <WebSearch query={query} results={results} searching={status.type === "running"} />;
    },
  },
  x_search: {
    parameters: z.object({
      query: z.string().optional(),
    }),
    execute: externalTool(),
    render: ({ args, status }) => (
      <WebSearch
        query={`X: ${args.query ?? "posts"}`}
        results={[]}
        searching={status.type === "running"}
      />
    ),
  },
  code_execution: {
    parameters: z.object({}),
    execute: externalTool(),
    render: ({ result, status }) => {
      const output =
        result && typeof result === "object" && "output" in result
          ? String((result as { output: string }).output)
          : "";
      if (status.type === "incomplete") {
        return (
          <ToolError
            name="Code execution"
            target="Provider sandbox"
            message="Code execution failed."
          />
        );
      }
      const lines = output ? output.split("\n") : [];
      return (
        <TerminalBlock
          command="Provider code sandbox"
          lines={lines}
          visibleCount={lines.length}
          done={status.type !== "running"}
        />
      );
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
    render: ({ result, status }) =>
      status.type === "running" ? (
        <GenerationLoader label="Reading clock" active />
      ) : (
        <ToolCard title="Time" body={result?.formatted ?? result?.iso ?? "Done"} tone="ok" />
      ),
  },
  compare_options: {
    description:
      "Compare two or three user-relevant options and clearly recommend one. Use when the user asks for a structured comparison or selection advice.",
    parameters: z.object({
      traitLabels: z.array(z.string()).min(1).max(8),
      options: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            headline: z.string(),
            traits: z.array(z.union([z.string(), z.literal(false)])).max(8),
          }),
        )
        .min(2)
        .max(3),
      recommendedId: z.string(),
      reason: z.string(),
    }),
    execute: async (args) => args,
    render: ({ args, status }) =>
      status.type === "complete" ? (
        <ComparisonCard
          traitLabels={args.traitLabels}
          options={args.options}
          recommendedId={args.recommendedId}
          reason={args.reason}
        />
      ) : (
        <GenerationLoader label="Comparing options" active />
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
      <ArtifactCard
        title={args.title ?? "Untitled artifact"}
        meta={`${args.kind ?? "document"} · Opened in canvas`}
        kind={args.kind === "code" || args.kind === "html" ? "code" : "document"}
        words={(args.content ?? "").trim().split(/\s+/).filter(Boolean).length}
        generating={status.type === "running"}
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
    render: ({ result, status }) => {
      const files =
        (result as { files?: Array<{ path: string; size: number }> } | undefined)?.files ?? [];
      const nodes = buildFileTree(files);
      return (
        <FileTree nodes={nodes} visibleCount={nodes.length} loading={status.type === "running"} />
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
        <FileCard
          name={file?.path ?? args.path ?? "File"}
          size={file?.size}
          downloadUrl={file?.downloadUrl}
          action="open"
          loading={status.type === "running"}
        />
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
        <FileCard
          name={file?.path ?? args.path ?? "File"}
          size={file?.size}
          downloadUrl={file?.downloadUrl}
          action="write"
          loading={status.type === "running"}
        />
      );
    },
  },
  choose_presentation_style: {
    description:
      "Confirm a presentation design system before creation. Generate 2 to 4 project-specific whole directions based on genuine ambiguity, not a fixed set of presets. Each direction must independently define how the deck argues (narrative mode) and how it looks (visual style), plus executable typography, composition, imagery, motif, density, and palette behavior. Directions must differ in communication strategy, not merely colors. Preserve a custom escape hatch. Use exactly once before create_presentation unless the user supplied a clear direction or asked you to decide.",
    parameters: z.object({
      designRead: z
        .string()
        .describe(
          "One concise sentence explaining the inferred audience, purpose, and visual need",
        ),
      options: z
        .array(
          z.object({
            id: z.string(),
            name: z
              .string()
              .describe("Short evocative direction name, not a generic template label"),
            mood: z.string().describe("Three or four plain-language mood words"),
            rationale: z.string().describe("Why this direction fits the user's topic and audience"),
            narrativeMode: z
              .enum(["pyramid", "narrative", "instructional", "showcase", "briefing", "custom"])
              .describe("How the argument advances across the deck; custom is allowed"),
            narrativeBehavior: z
              .string()
              .describe("Project-specific page-to-page argument and pacing behavior"),
            visualStyle: z
              .string()
              .describe(
                "A project-fit visual language such as editorial, data-journalism, swiss-minimal, paper-cut, blueprint, or a novel custom style; this is reference vocabulary, not a whitelist",
              ),
            visualBehavior: z
              .string()
              .describe(
                "Shape language, whitespace rhythm, texture, elevation, and decoration behavior",
              ),
            imageStrategy: z
              .enum(["none", "photography", "illustration", "mixed", "data-led"])
              .describe("The deck-wide role of images and data visuals"),
            compositionRule: z
              .string()
              .describe("Deck-wide hierarchy and composition tendency without fixed coordinates"),
            typographyRule: z
              .string()
              .describe("Title/body character, hierarchy, contrast, and editable font behavior"),
            recurringMotif: z
              .string()
              .describe("One subject-derived cross-page motif that varies by page role"),
            background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            typography: z.enum(["modern", "editorial", "technical", "friendly"]),
            composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
            density: z.enum(["airy", "balanced", "dense"]),
            recommended: z.boolean().optional(),
          }),
        )
        .min(2)
        .max(4),
    }),
    execute: humanTool(),
    render: ({ args, result, addResult }) => {
      const options = args.options ?? [];
      const selected =
        result && typeof result === "object" && "selected" in result
          ? String((result as { selected: string }).selected)
          : null;
      if (selected) {
        const option = options.find((item) => item.id === selected);
        const customDirection =
          selected === "custom" &&
          result &&
          typeof result === "object" &&
          "customDirection" in result
            ? String((result as { customDirection: string }).customDirection)
            : null;
        return (
          <ToolCard
            title="Visual direction"
            body={
              customDirection
                ? `Custom: ${customDirection}`
                : `Selected ${option?.name ?? selected}`
            }
            tone="ok"
          />
        );
      }
      if (options.length < 2) {
        return (
          <ToolCard
            title="Visual direction"
            body="Analyzing the brief and composing distinct design systems"
            tone="wait"
          />
        );
      }
      return (
        <RecommendationChoices
          detail={args.designRead || "Design systems tailored to this presentation"}
          options={options as VisualDirection[]}
          onSelect={(option) => addResult({ selected: option.id, design: option })}
          onCustom={(customDirection) => addResult({ selected: "custom", customDirection })}
        />
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
      design: z
        .object({
          name: z.string(),
          mood: z.string(),
          rationale: z.string(),
          background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          typography: z.enum(["modern", "editorial", "technical", "friendly"]),
          composition: z.enum(["bold", "editorial", "structured", "cinematic"]),
          density: z.enum(["airy", "balanced", "dense"]),
          narrativeMode: z
            .enum(["pyramid", "narrative", "instructional", "showcase", "briefing", "custom"])
            .optional(),
          narrativeBehavior: z.string().optional(),
          visualStyle: z.string().optional(),
          visualBehavior: z.string().optional(),
          imageStrategy: z
            .enum(["none", "photography", "illustration", "mixed", "data-led"])
            .optional(),
          compositionRule: z.string().optional(),
          typographyRule: z.string().optional(),
          recurringMotif: z.string().optional(),
        })
        .optional()
        .describe("The exact visual direction selected by the user"),
      brand: z
        .object({
          name: z.string().optional(),
          logoText: z.string().optional(),
          titleFont: z.string().optional(),
          bodyFont: z.string().optional(),
          footer: z.string().optional(),
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
        .optional()
        .describe("Brand settings explicitly supplied by the user"),
      slides: z
        .array(
          z.object({
            title: z.string().describe("Slide title"),
            subtitle: z.string().optional().describe("Short supporting line"),
            body: z.string().optional().describe("Short paragraph, preferably under 60 words"),
            bullets: z
              .array(z.string())
              .max(30)
              .optional()
              .describe(
                "Concise audience-facing points. Prefer five or fewer per slide; dense input is automatically split into continuation slides.",
              ),
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
              .optional()
              .describe(
                "Optional layout hint; the orchestrator validates semantic fit and capacity",
              ),
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
            chart: z
              .object({
                type: z.enum(["bar", "line", "pie"]),
                categories: z.array(z.string()).min(1).max(12),
                series: z
                  .array(z.object({ name: z.string(), values: z.array(z.number()).min(1).max(12) }))
                  .min(1)
                  .max(6),
              })
              .optional()
              .describe("Traceable chart data supplied by the user"),
            table: z
              .object({
                headers: z.array(z.string()).min(1).max(6),
                rows: z.array(z.array(z.string()).max(6)).max(8),
              })
              .optional()
              .describe(
                "Genuine traceable tabular data supplied by the user or research. Never use placeholder, sample, TBD, empty, or invented cells to obtain a table layout.",
              ),
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
          <ArtifactCard
            title={args.title ?? "Presentation"}
            meta={`${args.slides?.length ?? 0} slides · Building in canvas`}
            kind="presentation"
            generating
          />
        );
      }

      if (file?.error || status.type === "incomplete") {
        return (
          <ToolError
            name="Presentation"
            target={args.title ?? "Presentation"}
            message={file?.error ?? "Presentation generation failed."}
          />
        );
      }

      return (
        <ArtifactCard
          title={file?.fileName ?? `${args.title ?? "Presentation"}.pptx`}
          meta={`${file?.slideCount ?? args.slides?.length ?? 0} slides · PowerPoint · Opened in canvas`}
          kind="presentation"
        />
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
      if (status.type === "incomplete") {
        return (
          <GeneratedImage
            alt={args.prompt ?? "Generated image"}
            error={
              status.reason === "content-filter"
                ? "The provider blocked this image."
                : "Image generation failed."
            }
          />
        );
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
      if (status.type === "incomplete") {
        return (
          <GeneratedImage
            alt={args.prompt ?? "Edited image"}
            error={
              status.reason === "content-filter"
                ? "The provider blocked this edit."
                : "Image editing failed."
            }
          />
        );
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
    render: ({ args, result, addResult, status }) => {
      const state = result
        ? result.approved
          ? "done"
          : "denied"
        : status.type === "requires-action"
          ? "request"
          : status.type === "running"
            ? "preparing"
            : "running";
      return (
        <ApprovalCard
          state={state}
          title="Approve plan"
          subtitle={args.summary ?? "Review the proposed steps before continuing."}
          steps={args.steps ?? []}
          onApprove={() => addResult({ approved: true })}
          onDeny={() => addResult({ approved: false })}
        />
      );
    },
  },
});
