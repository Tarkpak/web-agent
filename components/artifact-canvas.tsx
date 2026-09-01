"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProviderSettings } from "@/hooks/use-provider-settings";
import type { Artifact } from "@/lib/artifacts";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FileUpIcon,
  EyeIcon,
  LoaderCircleIcon,
  LayoutDashboardIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";

const streamdownPlugins = { cjk, code };

function formatFileSize(bytes?: number) {
  if (bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type EditableField =
  | { field: "title" | "subtitle" | "body"; bulletIndex?: never }
  | { field: "bullet"; bulletIndex: number };

const themeStyles = {
  tech: { canvas: "bg-[#07111f] text-white", accent: "bg-cyan-400", muted: "text-slate-300" },
  dark: { canvas: "bg-[#111111] text-white", accent: "bg-lime-400", muted: "text-neutral-300" },
  light: { canvas: "bg-[#f8fafc] text-slate-950", accent: "bg-cyan-600", muted: "text-slate-600" },
} as const;

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ChartDataEditor({
  slide,
  update,
}: {
  slide: NonNullable<Artifact["slides"]>[number];
  update: (slide: NonNullable<Artifact["slides"]>[number]) => void;
}) {
  if (!slide.chart) return null;
  return (
    <div className="mt-4 space-y-3">
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        {(["bar", "line", "pie"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() =>
              update({
                ...slide,
                chart: {
                  ...slide.chart!,
                  type,
                  series: type === "pie" ? slide.chart!.series.slice(0, 1) : slide.chart!.series,
                },
              })
            }
            className={`rounded-md px-3 py-1 text-xs transition-colors active:scale-[0.96] ${slide.chart?.type === type ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {type}
          </button>
        ))}
      </div>
      <Input
        value={slide.chart.categories.join(", ")}
        onChange={(event) =>
          update({ ...slide, chart: { ...slide.chart!, categories: parseCsv(event.target.value) } })
        }
        placeholder="Categories, comma separated"
        aria-label="Chart categories"
      />
      {slide.chart.series.map((series, index) => (
        <div key={index} className="grid grid-cols-[8rem_1fr] gap-2">
          <Input
            value={series.name}
            onChange={(event) => {
              const next = [...slide.chart!.series];
              next[index] = { ...series, name: event.target.value };
              update({ ...slide, chart: { ...slide.chart!, series: next } });
            }}
            aria-label={`Series ${index + 1} name`}
          />
          <Input
            value={series.values.join(", ")}
            onChange={(event) => {
              const next = [...slide.chart!.series];
              next[index] = {
                ...series,
                values: parseCsv(event.target.value).map(Number).filter(Number.isFinite),
              };
              update({ ...slide, chart: { ...slide.chart!, series: next } });
            }}
            aria-label={`Series ${index + 1} values`}
          />
        </div>
      ))}
      {slide.chart.type !== "pie" ? (
        <Button
          size="sm"
          variant="outline"
          className="active:scale-[0.96] transition-transform"
          onClick={() =>
            update({
              ...slide,
              chart: {
                ...slide.chart!,
                series: [
                  ...slide.chart!.series,
                  {
                    name: `Series ${slide.chart!.series.length + 1}`,
                    values: slide.chart!.categories.map(() => 0),
                  },
                ],
              },
            })
          }
        >
          <PlusIcon />
          Add series
        </Button>
      ) : null}
    </div>
  );
}

function TableDataEditor({
  slide,
  update,
}: {
  slide: NonNullable<Artifact["slides"]>[number];
  update: (slide: NonNullable<Artifact["slides"]>[number]) => void;
}) {
  if (!slide.table) return null;
  return (
    <div className="mt-4 space-y-2">
      <Input
        value={slide.table.headers.join(", ")}
        onChange={(event) =>
          update({ ...slide, table: { ...slide.table!, headers: parseCsv(event.target.value) } })
        }
        placeholder="Headers, comma separated"
        aria-label="Table headers"
      />
      {slide.table.rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={row.join(", ")}
            onChange={(event) => {
              const rows = [...slide.table!.rows];
              rows[index] = parseCsv(event.target.value);
              update({ ...slide, table: { ...slide.table!, rows } });
            }}
            aria-label={`Table row ${index + 1}`}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() =>
              update({
                ...slide,
                table: {
                  ...slide.table!,
                  rows: slide.table!.rows.filter((_, rowIndex) => rowIndex !== index),
                },
              })
            }
            aria-label={`Delete row ${index + 1}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="active:scale-[0.96] transition-transform"
        onClick={() =>
          update({
            ...slide,
            table: {
              ...slide.table!,
              rows: [...slide.table!.rows, slide.table!.headers.map(() => "")],
            },
          })
        }
      >
        <PlusIcon />
        Add row
      </Button>
    </div>
  );
}

function PresentationEditor({ artifact }: { artifact: Artifact }) {
  const { settings } = useProviderSettings();
  const [deck, setDeck] = useState(artifact);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selection, setSelection] = useState<EditableField>({ field: "title" });
  const [instruction, setInstruction] = useState("Make it clearer and more concise");
  const [rewriting, setRewriting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">(
    artifact.previewUrls?.length ? "preview" : "edit",
  );

  useEffect(() => {
    setDeck((current) =>
      current.title === artifact.title
        ? {
            ...current,
            fileName: current.fileName ?? artifact.fileName,
            downloadUrl: current.downloadUrl ?? artifact.downloadUrl,
            previewUrls:
              current.generationStatus === "drafting"
                ? current.previewUrls
                : (artifact.previewUrls ?? current.previewUrls),
            slides:
              current.generationStatus === "drafting"
                ? current.slides
                : (artifact.slides ?? current.slides),
            qualityIssues: artifact.qualityIssues ?? current.qualityIssues,
            narrativeQuality: artifact.narrativeQuality ?? current.narrativeQuality,
            generationStatus:
              current.generationStatus === "drafting"
                ? "drafting"
                : (artifact.generationStatus ?? current.generationStatus),
            generationError: artifact.generationError ?? current.generationError,
          }
        : artifact,
    );
  }, [artifact]);

  useEffect(() => {
    if (artifact.generationStatus === "ready" && artifact.previewUrls?.length) {
      setMode("preview");
    }
  }, [artifact.generationStatus, artifact.previewUrls]);

  const slides = deck.slides ?? [];
  const slide = slides[activeSlide] ?? slides[0];
  const theme = themeStyles[deck.theme ?? "tech"];
  const selectedText = useMemo(() => {
    if (!slide) return "";
    if (selection.field === "bullet") return slide.bullets?.[selection.bulletIndex] ?? "";
    return slide[selection.field] ?? "";
  }, [selection, slide]);

  const updateSlide = (
    update: (
      current: NonNullable<Artifact["slides"]>[number],
    ) => NonNullable<Artifact["slides"]>[number],
  ) => {
    setMode("edit");
    setDeck((current) => ({
      ...current,
      generationStatus: "drafting",
      downloadUrl: undefined,
      previewUrls: [],
      qualityIssues: [],
      narrativeQuality: undefined,
      slides: (current.slides ?? []).map((item, index) =>
        index === activeSlide ? update(item) : item,
      ),
    }));
  };

  const updateBrand = (field: keyof NonNullable<Artifact["brand"]>, value: string) => {
    setMode("edit");
    setDeck((current) => ({
      ...current,
      brand: { ...current.brand, [field]: value },
      generationStatus: "drafting",
      downloadUrl: undefined,
      previewUrls: [],
      qualityIssues: [],
    }));
  };

  const updateSelectedText = (text: string) => {
    updateSlide((current) => {
      if (selection.field !== "bullet") return { ...current, [selection.field]: text };
      const bullets = [...(current.bullets ?? [])];
      bullets[selection.bulletIndex] = text;
      return { ...current, bullets };
    });
  };

  const rewriteSelection = async () => {
    if (!selectedText.trim() || !instruction.trim() || !slide) return;
    setRewriting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/presentations/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          deckTitle: deck.title,
          slideTitle: slide.title,
          field: selection.field,
          text: selectedText,
          instruction,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI rewrite failed.");
      updateSelectedText(result.text);
      setMessage("Replacement applied. Export when the deck is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI rewrite failed.");
    } finally {
      setRewriting(false);
    }
  };

  const exportDeck = async (layoutMode: "auto" | "preserve" = "preserve") => {
    setExporting(true);
    if (layoutMode === "auto") setOrchestrating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: deck.title,
          subtitle: deck.subtitle,
          theme: deck.theme ?? "tech",
          design: deck.design,
          brand: deck.brand,
          masterProfile: deck.masterProfile,
          layoutMode,
          slides,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Export failed.");
      setDeck((current) => ({
        ...current,
        generationStatus: "ready",
        fileName: result.fileName,
        downloadUrl: result.downloadUrl,
        previewUrls: result.previewUrls,
        qualityIssues: result.quality?.issues,
        narrativeQuality: result.quality?.narrative,
        slides: result.slides ?? current.slides,
      }));
      setMode("preview");
      setMessage("PowerPoint is up to date.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
      setOrchestrating(false);
    }
  };

  const changeLayout = () => {
    if (!slide || slide.chart || slide.table || activeSlide === 0) return;
    const alternatives = slide.layoutAlternatives?.length
      ? slide.layoutAlternatives
      : (["split", "list", "statement"] as const);
    const nextLayout = alternatives[0] ?? "split";
    const templateIds = {
      cover: "cover-accent-rail",
      statement: "statement-focus",
      split: "split-narrative-list",
      list: "numbered-list",
      comparison: "two-column-comparison",
      timeline: "milestone-timeline",
      quote: "editorial-quote",
      closing: "closing-halo",
      chart: "data-chart",
      table: "data-table",
    } as const;
    updateSlide((current) => ({
      ...current,
      layout: nextLayout,
      templateId: templateIds[nextLayout],
      layoutReason: "Selected as an alternate composition for the same content.",
      layoutAlternatives: [current.layout ?? "split", ...alternatives.slice(1)],
    }));
    setDeck((current) => ({ ...current, narrativeQuality: undefined }));
    setMessage(`Changed slide ${activeSlide + 1} to ${nextLayout}.`);
  };

  const importTemplate = async (file?: File) => {
    if (!file) return;
    setImportingTemplate(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/presentations/templates/import", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Template import failed.");
      setDeck((current) => ({
        ...current,
        brand: { ...current.brand, ...result.brand },
        masterProfile: result.profile,
        generationStatus: "drafting",
        downloadUrl: undefined,
        previewUrls: [],
        qualityIssues: [],
      }));
      setMode("edit");
      setMessage(
        `Imported ${result.profile.layoutNames.length} layouts and ${result.profile.assetCount} master assets.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template import failed.");
    } finally {
      setImportingTemplate(false);
    }
  };

  const removeTemplate = () => {
    setMode("edit");
    setDeck((current) => ({
      ...current,
      masterProfile: undefined,
      generationStatus: "drafting",
      downloadUrl: undefined,
      previewUrls: [],
      qualityIssues: [],
    }));
    setMessage("Corporate template removed. Imported brand values remain editable.");
  };

  const duplicateSlide = () => {
    if (!slide) return;
    const copy = {
      ...slide,
      bullets: slide.bullets ? [...slide.bullets] : undefined,
      chart: slide.chart
        ? {
            ...slide.chart,
            categories: [...slide.chart.categories],
            series: slide.chart.series.map((series) => ({ ...series, values: [...series.values] })),
          }
        : undefined,
      table: slide.table
        ? { headers: [...slide.table.headers], rows: slide.table.rows.map((row) => [...row]) }
        : undefined,
    };
    setDeck((current) => {
      const next = [...(current.slides ?? [])];
      next.splice(activeSlide + 1, 0, copy);
      return {
        ...current,
        slides: next,
        generationStatus: "drafting",
        downloadUrl: undefined,
        previewUrls: [],
      };
    });
    setActiveSlide(activeSlide + 1);
  };

  const removeSlide = () => {
    if (slides.length <= 1) return;
    setDeck((current) => ({
      ...current,
      slides: (current.slides ?? []).filter((_, index) => index !== activeSlide),
      generationStatus: "drafting",
      downloadUrl: undefined,
      previewUrls: [],
    }));
    setActiveSlide(Math.max(0, activeSlide - 1));
  };

  if (!slide) return <div className="p-6 text-sm text-muted-foreground">No slides available.</div>;

  return (
    <div className="grid h-full min-h-0 grid-cols-[10rem_minmax(25rem,1fr)_17rem] bg-muted/30 max-xl:grid-cols-[7rem_minmax(20rem,1fr)_15rem] max-md:min-w-[44rem]">
      <nav className="overflow-y-auto border-r bg-background p-2" aria-label="Slides">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">{slides.length} slides</span>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setMode("edit");
              setDeck((current) => ({
                ...current,
                slides: [...(current.slides ?? []), { title: "New slide", bullets: [] }],
                generationStatus: "drafting",
                downloadUrl: undefined,
                previewUrls: [],
              }));
              setActiveSlide(slides.length);
            }}
            aria-label="Add slide"
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="grid gap-2">
          {slides.map((item, index) => (
            <button
              key={`${index}-${item.title}`}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={`group text-left transition-[background-color,box-shadow] duration-150 ${index === activeSlide ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-muted"}`}
            >
              {deck.previewUrls?.[index] ? (
                <img
                  src={deck.previewUrls[index]}
                  alt={`Slide ${index + 1}`}
                  className="aspect-video w-full bg-white object-contain outline outline-black/10 dark:outline-white/10"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted px-2 text-center text-[10px] text-muted-foreground">
                  Draft slide {index + 1}
                </div>
              )}
              <p className="truncate px-2 pt-1.5 text-[11px] text-muted-foreground">
                {index + 1}. {item.title}
              </p>
              {item.templateId ? (
                <p className="truncate px-2 pb-1.5 text-[9px] text-muted-foreground/70">
                  {item.templateId}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3">
          <div className="flex items-center gap-2 text-xs">
            {exporting || deck.generationStatus === "building" ? (
              <LoaderCircleIcon className="size-3.5 animate-spin text-primary" />
            ) : (
              <CheckIcon className="size-3.5 text-emerald-600" />
            )}
            <span>
              {exporting
                ? "Updating PowerPoint"
                : deck.generationStatus === "building"
                  ? "Content ready, composing PowerPoint"
                  : deck.generationStatus === "drafting"
                    ? "Draft has unpublished changes"
                    : deck.qualityIssues?.length
                      ? `PowerPoint ready · ${deck.qualityIssues.length} layout warning${deck.qualityIssues.length === 1 ? "" : "s"}`
                      : "PowerPoint ready"}
            </span>
          </div>
          <div className="flex gap-1">
            <div className="mr-2 flex rounded-lg bg-muted p-0.5">
              <Button
                size="sm"
                variant={mode === "preview" ? "secondary" : "ghost"}
                onClick={() => setMode("preview")}
                disabled={!deck.previewUrls?.length}
              >
                <EyeIcon />
                Preview
              </Button>
              <Button
                size="sm"
                variant={mode === "edit" ? "secondary" : "ghost"}
                onClick={() => setMode("edit")}
              >
                <PencilIcon />
                Edit
              </Button>
            </div>
            {mode === "edit" ? (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={duplicateSlide}
                  aria-label="Duplicate slide"
                >
                  <CopyIcon />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={removeSlide}
                  disabled={slides.length <= 1}
                  aria-label="Delete slide"
                >
                  <Trash2Icon />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {(exporting || deck.generationStatus === "building") && (
          <div className="h-0.5 overflow-hidden bg-muted">
            <div className="h-full w-2/3 animate-pulse bg-primary" />
          </div>
        )}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
          {mode === "preview" && deck.previewUrls?.[activeSlide] ? (
            <img
              src={deck.previewUrls[activeSlide]}
              alt={`Rendered slide ${activeSlide + 1}`}
              className="aspect-video w-full max-w-5xl bg-white object-contain shadow-[0_18px_60px_rgba(0,0,0,0.18)] outline outline-black/10 dark:outline-white/10"
            />
          ) : (
            <section
              className={`relative aspect-video w-full max-w-5xl overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.18)] outline outline-black/10 dark:outline-white/10 ${theme.canvas}`}
              style={
                deck.brand
                  ? {
                      backgroundColor: deck.brand.background ?? deck.design?.background,
                      color: deck.brand.foreground ?? deck.design?.foreground,
                    }
                  : undefined
              }
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 ${theme.accent}`} />
              <div className="flex h-full flex-col p-[7%]">
                <p className="mb-3 text-xs font-semibold opacity-60">
                  {String(activeSlide + 1).padStart(2, "0")}
                </p>
                <Textarea
                  rows={2}
                  value={slide.title}
                  onFocus={() => setSelection({ field: "title" })}
                  onChange={(event) => {
                    setSelection({ field: "title" });
                    updateSlide((current) => ({ ...current, title: event.target.value }));
                  }}
                  className="field-sizing-fixed h-20 min-h-0 resize-none border-transparent bg-transparent p-0 text-3xl leading-tight font-semibold text-inherit shadow-none focus-visible:border-current/20 focus-visible:ring-0"
                  aria-label="Slide title"
                />
                <Input
                  value={slide.subtitle ?? ""}
                  placeholder="Add a supporting line"
                  onFocus={() => setSelection({ field: "subtitle" })}
                  onChange={(event) => {
                    setSelection({ field: "subtitle" });
                    updateSlide((current) => ({ ...current, subtitle: event.target.value }));
                  }}
                  className={`mt-2 border-transparent bg-transparent px-0 shadow-none focus-visible:border-current/20 focus-visible:ring-0 ${theme.muted}`}
                  aria-label="Slide subtitle"
                />
                {slide.chart ? (
                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <ChartDataEditor slide={slide} update={(next) => updateSlide(() => next)} />
                  </div>
                ) : slide.table ? (
                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <TableDataEditor slide={slide} update={(next) => updateSlide(() => next)} />
                  </div>
                ) : (
                  <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 gap-8">
                    <Textarea
                      value={slide.body ?? ""}
                      placeholder="Add body text"
                      onFocus={() => setSelection({ field: "body" })}
                      onChange={(event) => {
                        setSelection({ field: "body" });
                        updateSlide((current) => ({ ...current, body: event.target.value }));
                      }}
                      className={`field-sizing-fixed h-full resize-none border-transparent bg-transparent p-0 text-base leading-6 shadow-none focus-visible:border-current/20 focus-visible:ring-0 ${theme.muted}`}
                      aria-label="Slide body"
                    />
                    <div className="space-y-2 overflow-hidden">
                      {(slide.bullets ?? []).map((bullet, index) => (
                        <div key={index} className="flex gap-2 border-l-2 border-current/30 pl-3">
                          <Textarea
                            rows={2}
                            value={bullet}
                            onFocus={() => setSelection({ field: "bullet", bulletIndex: index })}
                            onChange={(event) => {
                              setSelection({ field: "bullet", bulletIndex: index });
                              updateSlide((current) => {
                                const bullets = [...(current.bullets ?? [])];
                                bullets[index] = event.target.value;
                                return { ...current, bullets };
                              });
                            }}
                            className="field-sizing-fixed h-12 min-h-0 resize-none border-transparent bg-transparent p-1 text-sm text-inherit shadow-none focus-visible:border-current/20 focus-visible:ring-0"
                            aria-label={`Bullet ${index + 1}`}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs opacity-60 hover:opacity-100"
                        onClick={() =>
                          updateSlide((current) => ({
                            ...current,
                            bullets: [...(current.bullets ?? []), "New point"],
                          }))
                        }
                      >
                        + Add point
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-right text-[10px] opacity-40">{deck.title}</p>
              </div>
            </section>
          )}
        </div>
      </main>

      <aside
        className={`overflow-y-auto border-l bg-background p-4 ${mode === "preview" ? "opacity-60" : ""}`}
      >
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI rewrite</h3>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Editing{" "}
          {selection.field === "bullet"
            ? `point ${(selection.bulletIndex ?? 0) + 1}`
            : selection.field}{" "}
          on slide {activeSlide + 1}
        </p>
        <div className="mt-3 rounded-md bg-muted p-2 text-xs leading-5 text-muted-foreground line-clamp-4">
          {selectedText || "Select a text field on the slide."}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Make it shorter", "Improve clarity", "More persuasive"].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInstruction(prompt)}
              className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
            >
              {prompt}
            </button>
          ))}
        </div>
        <Textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          className="mt-3 min-h-24 resize-none"
          placeholder="Describe the change"
        />
        <Button
          className="mt-2 w-full active:scale-[0.96] transition-transform"
          onClick={rewriteSelection}
          disabled={mode === "preview" || rewriting || !selectedText.trim()}
        >
          {rewriting ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}Rewrite
          selection
        </Button>
        {message && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground" role="status">
            {message}
          </p>
        )}
        <div className="my-5 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Smart layout</p>
          <span className="text-xs font-semibold tabular-nums text-primary">
            {deck.narrativeQuality?.score ?? "--"}
          </span>
        </div>
        <Button
          variant="outline"
          className="mt-2 w-full active:scale-[0.96] transition-transform"
          onClick={() => void exportDeck("auto")}
          disabled={mode === "preview" || exporting}
        >
          {orchestrating ? <LoaderCircleIcon className="animate-spin" /> : <LayoutDashboardIcon />}
          Auto arrange deck
        </Button>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-xs"
          onClick={changeLayout}
          disabled={mode === "preview" || activeSlide === 0 || Boolean(slide.chart || slide.table)}
        >
          <LayoutDashboardIcon />
          Try alternate layout
        </Button>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          {slide.layoutReason ??
            "Auto arrange analyzes each slide's narrative role and content capacity."}
        </p>
        {deck.narrativeQuality ? (
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[9px] text-muted-foreground">
            {Object.entries(deck.narrativeQuality.dimensions).map(([label, value]) => (
              <div key={label}>
                <span className="block font-semibold text-foreground">{value}</span>
                {label}
              </div>
            ))}
          </div>
        ) : null}
        <div className="my-5 h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Corporate template</p>
          {deck.masterProfile ? (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={removeTemplate}
              disabled={mode === "preview" || importingTemplate}
              aria-label="Remove corporate template"
              title="Remove corporate template"
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </div>
        <label
          className={`mt-2 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border text-xs font-medium transition-colors hover:bg-muted ${mode === "preview" || importingTemplate ? "pointer-events-none opacity-50" : ""}`}
        >
          {importingTemplate ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <FileUpIcon className="size-4" />
          )}
          {deck.masterProfile ? "Replace .pptx" : "Import .pptx"}
          <input
            type="file"
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="sr-only"
            disabled={mode === "preview" || importingTemplate}
            onChange={(event) => {
              void importTemplate(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {deck.masterProfile ? (
          <div className="mt-2 border-l-2 border-primary/40 pl-3 text-[11px] leading-5 text-muted-foreground">
            <p
              className="truncate font-medium text-foreground"
              title={deck.masterProfile.sourceName}
            >
              {deck.masterProfile.sourceName}
            </p>
            <p>
              {deck.masterProfile.masterNames.length} master ·{" "}
              {deck.masterProfile.layoutNames.length} layouts · {deck.masterProfile.assetCount}{" "}
              assets
            </p>
            <p className="truncate">
              {[deck.masterProfile.fonts.major, deck.masterProfile.fonts.minor]
                .filter(Boolean)
                .join(" / ") || "No theme fonts detected"}
            </p>
            <div className="mt-1 flex gap-1">
              {deck.masterProfile.colors.slice(0, 8).map((color) => (
                <span
                  key={color}
                  className="size-3 rounded-sm outline outline-black/10 dark:outline-white/10"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            {deck.masterProfile.warnings.length ? (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                {deck.masterProfile.warnings.length} import warning
                {deck.masterProfile.warnings.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Maps theme colors, fonts, simple master shapes, text, and raster logos.
          </p>
        )}
        <div className="my-5 h-px bg-border" />
        <p className="mb-2 text-xs font-medium">Brand</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={deck.brand?.name ?? ""}
            disabled={mode === "preview"}
            onChange={(event) => updateBrand("name", event.target.value)}
            placeholder="Brand name"
            aria-label="Brand name"
          />
          <Input
            value={deck.brand?.logoText ?? ""}
            disabled={mode === "preview"}
            onChange={(event) => updateBrand("logoText", event.target.value)}
            placeholder="Logo text"
            aria-label="Logo text"
          />
          <Input
            value={deck.brand?.titleFont ?? ""}
            disabled={mode === "preview"}
            onChange={(event) => updateBrand("titleFont", event.target.value)}
            placeholder="Title font"
            aria-label="Title font"
          />
          <Input
            value={deck.brand?.bodyFont ?? ""}
            disabled={mode === "preview"}
            onChange={(event) => updateBrand("bodyFont", event.target.value)}
            placeholder="Body font"
            aria-label="Body font"
          />
        </div>
        <Input
          value={deck.brand?.footer ?? ""}
          disabled={mode === "preview"}
          onChange={(event) => updateBrand("footer", event.target.value)}
          placeholder="Footer"
          aria-label="Brand footer"
          className="mt-2"
        />
        <div className="mt-2 flex gap-2">
          {(["background", "foreground", "muted", "accent", "secondary"] as const).map((field) => (
            <label
              key={field}
              className="relative size-7 overflow-hidden rounded-md outline outline-black/10 dark:outline-white/10"
              title={field}
            >
              <input
                type="color"
                value={deck.brand?.[field] ?? deck.design?.[field] ?? "#000000"}
                disabled={mode === "preview"}
                onChange={(event) => updateBrand(field, event.target.value)}
                className="absolute -inset-2 size-11 cursor-pointer border-0 p-0 disabled:cursor-not-allowed"
                aria-label={`Brand ${field}`}
              />
            </label>
          ))}
        </div>
        <div className="my-5 h-px bg-border" />
        <label className="text-xs font-medium" htmlFor="deck-title">
          Deck title
        </label>
        <Input
          id="deck-title"
          value={deck.title}
          disabled={mode === "preview"}
          onChange={(event) =>
            setDeck((current) => ({
              ...current,
              title: event.target.value,
              generationStatus: "drafting",
              downloadUrl: undefined,
              previewUrls: [],
            }))
          }
          className="mt-1"
        />
        <Button
          variant="outline"
          className="mt-3 w-full active:scale-[0.96] transition-transform"
          onClick={() => void exportDeck("preserve")}
          disabled={exporting}
        >
          {exporting ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}Update
          PowerPoint
        </Button>
        {deck.downloadUrl && (
          <Button
            className="mt-2 w-full"
            nativeButton={false}
            render={<a href={deck.downloadUrl} download />}
          >
            <DownloadIcon />
            Download .pptx
          </Button>
        )}
      </aside>
    </div>
  );
}

export function ArtifactCanvas({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const fileSize = formatFileSize(artifact.size);
  return (
    <aside
      className={`bg-background flex h-full min-w-[22rem] flex-col border-s max-lg:absolute max-lg:inset-y-0 max-lg:end-0 max-lg:z-20 max-lg:w-full max-lg:min-w-0 ${artifact.kind === "presentation" ? "flex-[0_1_80rem]" : "flex-[0_1_48rem]"}`}
    >
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {artifact.kind}
            {artifact.language ? ` / ${artifact.language}` : ""}
            {fileSize ? ` / ${fileSize}` : ""}
          </p>
          <h2 className="truncate text-sm font-medium">{artifact.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {artifact.downloadUrl && artifact.kind !== "presentation" ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={artifact.downloadUrl} download />}
            >
              <DownloadIcon />
              Download
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close canvas">
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {artifact.kind === "presentation" ? (
          <PresentationEditor artifact={artifact} />
        ) : artifact.kind === "image" && artifact.previewUrl ? (
          <div className="flex min-h-full items-center justify-center bg-neutral-100 p-5 dark:bg-neutral-950">
            <img
              src={artifact.previewUrl}
              alt={artifact.title}
              className="max-h-[calc(100dvh-7rem)] max-w-full object-contain outline outline-black/10 dark:outline-white/10"
            />
          </div>
        ) : artifact.kind === "pdf" && artifact.previewUrl ? (
          <iframe
            title={artifact.title}
            className="h-full min-h-[36rem] w-full bg-white"
            src={artifact.previewUrl}
          />
        ) : artifact.kind === "html" ? (
          <iframe
            title={artifact.title}
            sandbox="allow-scripts"
            className="h-full min-h-[480px] w-full bg-white"
            srcDoc={artifact.content ?? ""}
          />
        ) : artifact.kind === "markdown" ? (
          <Streamdown
            mode="static"
            className="aui-md p-5"
            plugins={streamdownPlugins}
            shikiTheme={["github-light", "github-dark"]}
            controls
            dir="auto"
          >
            {artifact.content ?? ""}
          </Streamdown>
        ) : artifact.kind === "text" ? (
          <pre className="p-5 font-sans text-sm leading-6 whitespace-pre-wrap wrap-break-word">
            {artifact.content ?? ""}
          </pre>
        ) : artifact.kind === "code" ? (
          <pre className="p-5 font-mono text-[13px] leading-6 whitespace-pre-wrap wrap-break-word">
            {artifact.content ?? ""}
          </pre>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-md">
              <FileIcon className="text-muted-foreground size-6" />
            </div>
            <div>
              <p className="font-medium">{artifact.fileName ?? artifact.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {[artifact.mimeType, fileSize].filter(Boolean).join(" · ") ||
                  "Preview is not available for this file type."}
              </p>
            </div>
            {artifact.downloadUrl ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={artifact.downloadUrl} download />}
              >
                <DownloadIcon />
                Download
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
