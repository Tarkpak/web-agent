import path from "node:path";
import PptxGenJS from "pptxgenjs";
import type {
  PresentationBrand,
  PresentationChart,
  PresentationDesign,
  PresentationMasterProfile,
  PresentationQualityIssue,
  PresentationSlide,
  PresentationTable,
} from "@/lib/artifacts";
import {
  resolvePresentationTemplate,
  type PresentationTemplate,
} from "@/lib/presentation-templates";

export type PresentationTheme = "tech" | "light" | "dark";

const SLIDE_WIDTH = 1600;
const SLIDE_HEIGHT = 900;
const PPT_WIDTH = 13.333;
const PPT_HEIGHT = 7.5;

const THEMES = {
  tech: {
    background: "#07111F",
    foreground: "#F8FAFC",
    muted: "#B8C4D4",
    accent: "#22D3EE",
    secondary: "#38BDF8",
  },
  dark: {
    background: "#111111",
    foreground: "#FAFAFA",
    muted: "#B8B8B8",
    accent: "#A3E635",
    secondary: "#FACC15",
  },
  light: {
    background: "#F8FAFC",
    foreground: "#111827",
    muted: "#475569",
    accent: "#0891B2",
    secondary: "#2563EB",
  },
} as const;

type TextElement = {
  kind: "text";
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  weight: number;
  maxLines: number;
  lineHeight: number;
  align?: "left" | "center" | "right";
};

type ShapeElement =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity?: number;
    }
  | {
      kind: "ellipse";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity?: number;
    }
  | {
      kind: "line";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity?: number;
      lineWidth?: number;
    };

type ChartElement = {
  kind: "chart";
  x: number;
  y: number;
  width: number;
  height: number;
  data: PresentationChart;
  colors: string[];
  foreground: string;
  muted: string;
};

type TableElement = {
  kind: "table";
  x: number;
  y: number;
  width: number;
  height: number;
  data: PresentationTable;
  headerColor: string;
  foreground: string;
  muted: string;
};

type ImageElement = {
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  assetId: string;
  assetUrl: string;
  templateId: string;
};

export type PresentationElement =
  | TextElement
  | ShapeElement
  | ChartElement
  | TableElement
  | ImageElement;

export type PresentationSlideIR = {
  width: typeof SLIDE_WIDTH;
  height: typeof SLIDE_HEIGHT;
  layout: NonNullable<PresentationSlide["layout"]>;
  template: PresentationTemplate;
  slotUsage: Record<string, { characters?: number; items?: number }>;
  elements: PresentationElement[];
};

type BuildSlideInput = {
  deckTitle: string;
  deckSubtitle?: string;
  theme?: PresentationTheme;
  design?: PresentationDesign;
  brand?: PresentationBrand;
  masterProfile?: PresentationMasterProfile;
  slide: PresentationSlide;
  index: number;
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function hex(value: string) {
  return value.replace(/^#/, "").toUpperCase();
}

function textLength(value: string) {
  return Array.from(value).reduce(
    (total, character) => total + ((character.codePointAt(0) ?? 0) > 0xff ? 2 : 1),
    0,
  );
}

function wrapText(value: string, maxUnits: number, maxLines: number) {
  const lines: string[] = [];
  let current = "";
  let units = 0;
  let truncated = false;
  const characters = Array.from(value.trim());
  for (const [index, character] of characters.entries()) {
    const size = (character.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
    if (units + size > maxUnits && current) {
      const whitespaceIndex = Math.max(current.lastIndexOf(" "), current.lastIndexOf("\t"));
      if (whitespaceIndex > 0) {
        lines.push(current.slice(0, whitespaceIndex).trim());
        current = `${current.slice(whitespaceIndex + 1)}${character}`;
        units = textLength(current);
      } else {
        lines.push(current.trim());
        current = character;
        units = size;
      }
      if (lines.length === maxLines) {
        truncated = index < characters.length;
        break;
      }
      continue;
    }
    current += character;
    units += size;
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  if (truncated && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.。,:：;；!！?？\s]+$/, "")}...`;
  }
  return lines;
}

function textCapacity(element: TextElement) {
  return Math.max(8, Math.floor((element.width / element.fontSize) * 1.9)) * element.maxLines;
}

export function buildPresentationSlide(input: BuildSlideInput): PresentationSlideIR {
  const {
    deckTitle,
    deckSubtitle,
    theme = "tech",
    design,
    brand,
    masterProfile,
    slide,
    index,
  } = input;
  const fallback = THEMES[theme] ?? THEMES.tech;
  const colors = {
    ...fallback,
    ...design,
    ...Object.fromEntries(
      Object.entries(brand ?? {}).filter(
        ([key, value]) =>
          ["background", "foreground", "muted", "accent", "secondary"].includes(key) && value,
      ),
    ),
  } as typeof fallback;
  const style = design?.visualStyle?.toLowerCase() ?? "";
  const isEditorial = /editorial|magazine|journal|刊|杂志/.test(style);
  const isTechnical = /technical|blueprint|data|dashboard|tech|工程|蓝图|数据/.test(style);
  const isExpressive =
    /brutal|zine|poster|memphis|paper|ink|chalk|sketch|pixel|海报|手绘|拼贴/.test(style);
  const fontFamily =
    design?.typography === "editorial" || isEditorial
      ? "Georgia"
      : design?.typography === "technical" || isTechnical
        ? "Aptos Mono"
        : design?.typography === "friendly"
          ? "Arial Rounded MT Bold"
          : "Aptos";
  const titleFontFamily = brand?.titleFont || fontFamily;
  const bodyFontFamily = brand?.bodyFont || fontFamily;
  const densityScale = design?.density === "airy" ? 1.12 : design?.density === "dense" ? 0.9 : 1;
  const titleWeight = isEditorial ? 600 : isExpressive ? 800 : 700;
  const headerAlignedRight =
    design?.composition === "cinematic" ||
    /right|asymmetr|右|非对称/.test(design?.compositionRule ?? "");
  const page = String(index + 1).padStart(2, "0");
  const layout = slide.layout ?? (index === 0 ? "cover" : "split");
  const template = resolvePresentationTemplate(layout, slide.templateId);
  const elements: PresentationElement[] = [
    {
      kind: "rect",
      x: 0,
      y: 0,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      color: colors.background,
    },
  ];
  if (masterProfile) {
    for (const decoration of masterProfile.decorations) {
      if (decoration.kind === "text") {
        elements.push({
          ...decoration,
          maxLines: 2,
          lineHeight: 1.2,
        });
      } else if (decoration.kind === "image") {
        elements.push({ ...decoration, templateId: masterProfile.id });
      } else {
        elements.push(decoration);
      }
    }
  }
  const bounds = (
    slot: string,
    fallbackBounds: { x: number; y: number; width: number; height: number },
  ) => template.slots[slot]?.bounds ?? fallbackBounds;

  const addText = (
    options: Omit<TextElement, "kind" | "fontFamily" | "height"> & {
      height?: number;
      role?: "title" | "body";
    },
  ) => {
    const { role = "body", ...textOptions } = options;
    elements.push({
      kind: "text",
      fontFamily: role === "title" ? titleFontFamily : bodyFontFamily,
      height:
        textOptions.height ??
        Math.ceil(textOptions.fontSize * textOptions.lineHeight * textOptions.maxLines * 1.15),
      ...textOptions,
    });
  };
  const addStandardHeader = (showSubtitle = true) => {
    const titleBounds = bounds("title", { x: 90, y: 125, width: 1380, height: 70 });
    const titleUnits = textLength(slide.title);
    const titleFontSize = Math.max(
      35,
      Math.round((titleUnits > 60 ? 38 : titleUnits > 46 ? 43 : 50) * densityScale),
    );
    const titleLines = titleUnits > 46 ? 2 : 1;
    addText({
      value: page,
      x: 90,
      y: 55,
      width: 80,
      fontSize: 18,
      color: colors.accent,
      weight: 700,
      maxLines: 1,
      lineHeight: 1.2,
      role: "title",
    });
    addText({
      value: slide.title,
      x: headerAlignedRight ? Math.max(titleBounds.x, 420) : titleBounds.x,
      y: titleBounds.y,
      width: headerAlignedRight ? Math.min(titleBounds.width, 1050) : titleBounds.width,
      height: titleLines === 2 ? 112 : titleBounds.height,
      fontSize: titleFontSize,
      color: colors.foreground,
      weight: titleWeight,
      maxLines: titleLines,
      lineHeight: 1.12,
    });
    if (slide.subtitle && showSubtitle)
      addText({
        value: slide.subtitle,
        x: 90,
        y: titleLines === 2 ? 242 : 205,
        width: 1320,
        fontSize: 24,
        color: colors.secondary,
        weight: 400,
        maxLines: 1,
        lineHeight: 1.2,
      });
  };
  const bullets = slide.bullets?.slice(0, 6) ?? [];

  if (layout === "cover") {
    const alignedRight = headerAlignedRight;
    const titleBounds = bounds("title", { x: 110, y: 245, width: 820, height: 190 });
    const subtitleBounds = bounds("subtitle", { x: 110, y: 455, width: 800, height: 100 });
    const x = alignedRight ? 650 : titleBounds.x;
    const coverTitleUnits = textLength(slide.title || deckTitle);
    const coverTitleFontSize = Math.max(
      50,
      Math.round((coverTitleUnits > 54 ? 50 : coverTitleUnits > 42 ? 58 : 76) * densityScale),
    );
    elements.push({
      kind: "rect",
      x: alignedRight ? 70 : 1360,
      y: 0,
      width: 170,
      height: SLIDE_HEIGHT,
      color: colors.accent,
      opacity: 0.92,
    });
    addText({
      value: slide.title || deckTitle,
      x,
      y: titleBounds.y,
      width: titleBounds.width,
      height: titleBounds.height,
      fontSize: coverTitleFontSize,
      color: colors.foreground,
      weight: titleWeight,
      maxLines: 2,
      lineHeight: 1.12,
      role: "title",
    });
    if (slide.subtitle || deckSubtitle)
      addText({
        value: slide.subtitle || deckSubtitle || "",
        x,
        y: subtitleBounds.y,
        width: subtitleBounds.width,
        height: subtitleBounds.height,
        fontSize: 31,
        color: colors.muted,
        weight: 400,
        maxLines: 2,
        lineHeight: 1.2,
      });
    elements.push({
      kind: "rect",
      x,
      y: Math.max(80, titleBounds.y - 24),
      width: 150,
      height: 7,
      color: colors.accent,
    });
  } else if (layout === "statement") {
    const titleBounds = bounds("title", { x: 150, y: 300, width: 1290, height: 280 });
    const bodyBounds = bounds("body", { x: 155, y: 620, width: 1050, height: 105 });
    const statementTitleUnits = textLength(slide.title);
    const statementTitleFontSize = Math.max(
      35,
      Math.round(
        (statementTitleUnits > 90 ? 35 : statementTitleUnits > 64 ? 44 : 70) * densityScale,
      ),
    );
    addText({
      value: page,
      x: 90,
      y: 55,
      width: 80,
      fontSize: 18,
      color: colors.accent,
      weight: titleWeight,
      maxLines: 1,
      lineHeight: 1.2,
    });
    addText({
      value: slide.title,
      x: titleBounds.x,
      y: titleBounds.y,
      width: titleBounds.width,
      height: titleBounds.height,
      fontSize: statementTitleFontSize,
      color: colors.foreground,
      weight: 700,
      maxLines: statementTitleUnits > 64 ? 4 : 3,
      lineHeight: 1.08,
      role: "title",
    });
    if (slide.body)
      addText({
        value: slide.body,
        x: bodyBounds.x,
        y: bodyBounds.y,
        width: bodyBounds.width,
        height: bodyBounds.height,
        fontSize: 26,
        color: colors.muted,
        weight: 400,
        maxLines: 3,
        lineHeight: 1.3,
      });
  } else if (layout === "quote") {
    const bodyBounds = bounds("body", { x: 250, y: 265, width: 1120, height: 350 });
    const subtitleBounds = bounds("subtitle", { x: 255, y: 680, width: 850, height: 45 });
    addText({
      value: "“",
      x: 105,
      y: 80,
      width: 160,
      fontSize: 170,
      color: colors.accent,
      weight: 700,
      maxLines: 1,
      lineHeight: 1,
    });
    addText({
      value: (slide.body || slide.title).replace(/^[“"「『]\s*|\s*[”"」』]$/g, ""),
      x: bodyBounds.x,
      y: bodyBounds.y,
      width: bodyBounds.width,
      height: bodyBounds.height,
      fontSize: Math.round(54 * densityScale),
      color: colors.foreground,
      weight: 500,
      maxLines: 5,
      lineHeight: 1.28,
    });
    if (slide.subtitle)
      addText({
        value: slide.subtitle,
        x: subtitleBounds.x,
        y: subtitleBounds.y,
        width: subtitleBounds.width,
        height: subtitleBounds.height,
        fontSize: 23,
        color: colors.muted,
        weight: 400,
        maxLines: 1,
        lineHeight: 1.2,
      });
  } else if (layout === "closing") {
    const titleBounds = bounds("title", { x: 260, y: 320, width: 1080, height: 180 });
    const bodyBounds = bounds("body", { x: 350, y: 530, width: 900, height: 130 });
    elements.push({
      kind: "ellipse",
      x: 540,
      y: 180,
      width: 520,
      height: 520,
      color: colors.accent,
      opacity: 0.09,
    });
    addText({
      value: slide.title,
      x: titleBounds.x,
      y: titleBounds.y,
      width: titleBounds.width,
      height: titleBounds.height,
      fontSize: Math.round(72 * densityScale),
      color: colors.foreground,
      weight: 700,
      maxLines: 2,
      lineHeight: 1.12,
      align: "center",
      role: "title",
    });
    if (slide.body || slide.subtitle)
      addText({
        value: slide.body || slide.subtitle || "",
        x: bodyBounds.x,
        y: bodyBounds.y,
        width: bodyBounds.width,
        height: bodyBounds.height,
        fontSize: 28,
        color: colors.muted,
        weight: 400,
        maxLines: 3,
        lineHeight: 1.25,
        align: "center",
      });
  } else if (layout === "chart" && slide.chart) {
    addStandardHeader();
    const chartBounds = bounds("chart", { x: 110, y: 285, width: 1380, height: 500 });
    elements.push({
      kind: "chart",
      ...chartBounds,
      data: slide.chart,
      colors: [colors.accent, colors.secondary, colors.muted, colors.foreground],
      foreground: colors.foreground,
      muted: colors.muted,
    });
  } else if (layout === "table" && slide.table) {
    addStandardHeader();
    const tableBounds = bounds("table", { x: 110, y: 285, width: 1380, height: 500 });
    elements.push({
      kind: "table",
      ...tableBounds,
      data: slide.table,
      headerColor: colors.accent,
      foreground: colors.foreground,
      muted: colors.muted,
    });
  } else if (layout === "timeline") {
    addStandardHeader();
    elements.push({
      kind: "line",
      x: 150,
      y: 520,
      width: 1300,
      height: 0,
      color: colors.muted,
      opacity: 0.45,
      lineWidth: 3,
    });
    bullets.slice(0, 5).forEach((bullet, bulletIndex) => {
      const x = 170 + bulletIndex * (1260 / Math.max(1, bullets.length - 1));
      elements.push({
        kind: "ellipse",
        x: x - 13,
        y: 507,
        width: 26,
        height: 26,
        color: colors.accent,
      });
      addText({
        value: String(bulletIndex + 1).padStart(2, "0"),
        x: x - 20,
        y: 440,
        width: 50,
        fontSize: 17,
        color: colors.secondary,
        weight: 700,
        maxLines: 1,
        lineHeight: 1.2,
      });
      addText({
        value: bullet,
        x: x - 105,
        y: bulletIndex % 2 ? 560 : 590,
        width: 210,
        fontSize: 21,
        color: colors.foreground,
        weight: 400,
        maxLines: 4,
        lineHeight: 1.3,
        align: "center",
      });
    });
  } else if (layout === "comparison") {
    addStandardHeader(false);
    elements.push({
      kind: "line",
      x: 800,
      y: 300,
      width: 0,
      height: 445,
      color: colors.muted,
      opacity: 0.35,
      lineWidth: 2,
    });
    [
      bullets.slice(0, Math.ceil(bullets.length / 2)),
      bullets.slice(Math.ceil(bullets.length / 2)),
    ].forEach((group, column) => {
      addText({
        value: column === 0 ? slide.subtitle || "Option A" : "Option B",
        x: 115 + column * 760,
        y: 310,
        width: 580,
        fontSize: 27,
        color: column === 0 ? colors.accent : colors.secondary,
        weight: 700,
        maxLines: 1,
        lineHeight: 1.2,
      });
      group.forEach((bullet, bulletIndex) =>
        addText({
          value: bullet,
          x: 115 + column * 760,
          y: 390 + bulletIndex * 105,
          width: 590,
          fontSize: 25,
          color: colors.foreground,
          weight: 400,
          maxLines: 3,
          lineHeight: 1.25,
        }),
      );
    });
  } else if (layout === "list") {
    addStandardHeader();
    bullets.forEach((bullet, bulletIndex) => {
      const y = 300 + bulletIndex * 82;
      addText({
        value: String(bulletIndex + 1).padStart(2, "0"),
        x: 110,
        y,
        width: 60,
        fontSize: 18,
        color: colors.accent,
        weight: 700,
        maxLines: 1,
        lineHeight: 1.2,
      });
      addText({
        value: bullet,
        x: 215,
        y,
        width: 1130,
        fontSize: 29,
        color: colors.foreground,
        weight: 400,
        maxLines: 2,
        lineHeight: 1.2,
      });
      elements.push({
        kind: "line",
        x: 210,
        y: y + 45,
        width: 1210,
        height: 0,
        color: colors.muted,
        opacity: 0.22,
        lineWidth: 1,
      });
    });
  } else {
    addStandardHeader();
    const top = slide.subtitle ? 300 : 270;
    if (slide.body)
      addText({
        value: slide.body,
        x: 90,
        y: top,
        width: bullets.length ? 530 : 1320,
        fontSize: Math.round(28 * densityScale),
        color: colors.muted,
        weight: 400,
        maxLines: 10,
        lineHeight: 1.5,
      });
    bullets.forEach((bullet, bulletIndex) => {
      const x = slide.body ? 760 : 130;
      const y = top + bulletIndex * 86;
      elements.push({ kind: "rect", x, y, width: 5, height: 48, color: colors.accent });
      addText({
        value: bullet,
        x: x + 28,
        y,
        width: slide.body ? 690 : 1260,
        fontSize: 27,
        color: colors.foreground,
        weight: 400,
        maxLines: 2,
        lineHeight: 1.25,
      });
    });
  }

  if (!masterProfile) {
    addText({
      value: brand?.footer || deckTitle,
      x: 82,
      y: 830,
      width: 790,
      fontSize: 16,
      color: colors.muted,
      weight: 400,
      maxLines: 1,
      lineHeight: 1.2,
    });
  }
  if (!masterProfile && design?.recurringMotif) {
    const motif = design.recurringMotif.trim();
    const motifWidth = Math.min(300, Math.max(110, textLength(motif) * 8));
    elements.push({
      kind: "line",
      x: 90,
      y: 792,
      width: motifWidth,
      height: 0,
      color: colors.accent,
      opacity: isExpressive ? 0.9 : 0.45,
      lineWidth: isExpressive ? 5 : 2,
    });
  }
  if (brand?.logoText && !masterProfile) {
    addText({
      value: brand.logoText,
      x: 1240,
      y: 48,
      width: 290,
      fontSize: 18,
      color: colors.foreground,
      weight: 700,
      maxLines: 1,
      lineHeight: 1.2,
      align: "right",
      role: "title",
    });
  }
  addText({
    value: page,
    x: 1460,
    y: 830,
    width: 70,
    fontSize: 18,
    color: colors.accent,
    weight: 700,
    maxLines: 1,
    lineHeight: 1.2,
    align: "right",
  });
  const slotUsage = {
    title: { characters: textLength(slide.title) },
    subtitle: { characters: textLength(slide.subtitle ?? "") },
    body: { characters: textLength(slide.body ?? "") },
    bullets: {
      characters: textLength((slide.bullets ?? []).join("")),
      items: slide.bullets?.length ?? 0,
    },
    chart: { items: slide.chart?.categories.length ?? 0 },
    table: { items: slide.table?.rows.length ?? 0 },
  };
  return { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, layout, template, slotUsage, elements };
}

export function validatePresentationSlide(ir: PresentationSlideIR, slideIndex: number) {
  const issues: PresentationQualityIssue[] = [];
  for (const [slotName, limits] of Object.entries(ir.template.slots)) {
    if (limits.bounds) {
      const safe = ir.template.safeArea;
      const slot = limits.bounds;
      if (
        slot.x < safe.x ||
        slot.y < safe.y ||
        slot.x + slot.width > safe.x + safe.width ||
        slot.y + slot.height > safe.y + safe.height
      ) {
        issues.push({
          slide: slideIndex + 1,
          severity: "error",
          code: "OUT_OF_BOUNDS",
          message: `${ir.template.name} ${slotName} slot exceeds the template safe area.`,
        });
      }
    }
    const usage = ir.slotUsage[slotName];
    if (!usage) continue;
    if (limits.maxCharacters && (usage.characters ?? 0) > limits.maxCharacters) {
      issues.push({
        slide: slideIndex + 1,
        severity: "warning",
        code: "SLOT_OVERFLOW",
        message: `${ir.template.name} ${slotName} slot exceeds ${limits.maxCharacters} character units.`,
      });
    }
    if (limits.maxItems && (usage.items ?? 0) > limits.maxItems) {
      issues.push({
        slide: slideIndex + 1,
        severity: "warning",
        code: "SLOT_OVERFLOW",
        message: `${ir.template.name} ${slotName} slot exceeds ${limits.maxItems} items.`,
      });
    }
  }
  for (const element of ir.elements) {
    if (
      element.x < 0 ||
      element.y < 0 ||
      element.x + element.width > ir.width ||
      element.y + element.height > ir.height
    ) {
      issues.push({
        slide: slideIndex + 1,
        severity: "error",
        code: "OUT_OF_BOUNDS",
        message: `${element.kind} element exceeds the slide boundary.`,
      });
    }
    if (element.kind === "chart") {
      if (element.data.type === "pie" && element.data.series.length !== 1) {
        issues.push({
          slide: slideIndex + 1,
          severity: "error",
          code: "DATA_MISMATCH",
          message: "Pie charts require exactly one series.",
        });
      }
      if (
        element.data.series.some(
          (series) => series.values.length !== element.data.categories.length,
        )
      ) {
        issues.push({
          slide: slideIndex + 1,
          severity: "error",
          code: "DATA_MISMATCH",
          message: "Chart series values must match the category count.",
        });
      }
      continue;
    }
    if (element.kind === "table") {
      if (element.data.rows.some((row) => row.length !== element.data.headers.length)) {
        issues.push({
          slide: slideIndex + 1,
          severity: "error",
          code: "DATA_MISMATCH",
          message: "Table rows must match the header count.",
        });
      }
      continue;
    }
    if (element.kind !== "text") continue;
    if (element.fontSize < 16) {
      issues.push({
        slide: slideIndex + 1,
        severity: "warning",
        code: "SMALL_TEXT",
        message: `Text "${element.value.slice(0, 32)}" is below 16pt.`,
      });
    }
    if (textLength(element.value) > textCapacity(element)) {
      issues.push({
        slide: slideIndex + 1,
        severity: "warning",
        code: "TEXT_OVERFLOW",
        message: `Text "${element.value.slice(0, 32)}" exceeds its layout slot.`,
      });
    }
  }
  return issues;
}

export function renderPresentationSlide(input: BuildSlideInput) {
  const ir = buildPresentationSlide(input);
  const elements = ir.elements.map((element) => {
    if (element.kind === "text") {
      const maxUnits = Math.max(8, Math.floor((element.width / element.fontSize) * 1.9));
      const lines = wrapText(element.value, maxUnits, element.maxLines);
      const anchor =
        element.align === "center" ? "middle" : element.align === "right" ? "end" : "start";
      const x =
        element.align === "center"
          ? element.x + element.width / 2
          : element.align === "right"
            ? element.x + element.width
            : element.x;
      return `<text x="${x}" y="${element.y + element.fontSize}" text-anchor="${anchor}" fill="${element.color}" font-family="${element.fontFamily}, 'Microsoft YaHei', Arial, sans-serif" font-size="${element.fontSize}" font-weight="${element.weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(element.fontSize * element.lineHeight)}">${escapeXml(line)}</tspan>`).join("")}</text>`;
    }
    if (element.kind === "chart") {
      const values = element.data.series.flatMap((series) => series.values);
      const max = Math.max(...values.map((value) => Math.abs(value)), 1);
      const plotX = element.x + 90;
      const plotY = element.y + 25;
      const plotWidth = element.width - 130;
      const plotHeight = element.height - 100;
      const categoryWidth = plotWidth / element.data.categories.length;
      const seriesWidth = Math.max(8, (categoryWidth * 0.72) / element.data.series.length);
      const grid = [0, 0.25, 0.5, 0.75, 1]
        .map(
          (ratio) =>
            `<line x1="${plotX}" y1="${plotY + plotHeight * ratio}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight * ratio}" stroke="${element.muted}" opacity="0.2"/>`,
        )
        .join("");
      if (element.data.type === "pie") {
        const series = element.data.series[0];
        const total = series.values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
        const radius = Math.min(plotWidth, plotHeight) * 0.38;
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        let angle = -Math.PI / 2;
        const slices = series.values.map((value, valueIndex) => {
          const slice = (Math.max(0, value) / total) * Math.PI * 2;
          const end = angle + slice;
          const x1 = cx + Math.cos(angle) * radius;
          const y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(end) * radius;
          const y2 = cy + Math.sin(end) * radius;
          const largeArc = slice > Math.PI ? 1 : 0;
          const labelAngle = angle + slice / 2;
          const labelX = cx + Math.cos(labelAngle) * radius * 0.63;
          const labelY = cy + Math.sin(labelAngle) * radius * 0.63;
          const label = `${element.data.categories[valueIndex]} ${Math.round((Math.max(0, value) / total) * 100)}%`;
          angle = end;
          return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${element.colors[valueIndex % element.colors.length]}"/><text x="${labelX}" y="${labelY}" text-anchor="middle" fill="${element.foreground}" font-family="Aptos, 'Microsoft YaHei', sans-serif" font-size="18">${escapeXml(label)}</text>`;
        });
        return `<g>${slices.join("")}</g>`;
      }
      const marks = element.data.series
        .map((series, seriesIndex) =>
          element.data.type === "line"
            ? `<polyline points="${series.values.map((value, valueIndex) => `${plotX + valueIndex * categoryWidth + categoryWidth / 2},${plotY + plotHeight - (Math.abs(value) / max) * plotHeight}`).join(" ")}" fill="none" stroke="${element.colors[seriesIndex % element.colors.length]}" stroke-width="4"/>${series.values.map((value, valueIndex) => `<circle cx="${plotX + valueIndex * categoryWidth + categoryWidth / 2}" cy="${plotY + plotHeight - (Math.abs(value) / max) * plotHeight}" r="7" fill="${element.colors[seriesIndex % element.colors.length]}"/>`).join("")}`
            : series.values
                .map((value, valueIndex) => {
                  const x =
                    plotX +
                    valueIndex * categoryWidth +
                    categoryWidth * 0.14 +
                    seriesIndex * seriesWidth;
                  const height = (Math.abs(value) / max) * plotHeight;
                  return `<rect x="${x}" y="${plotY + plotHeight - height}" width="${seriesWidth - 3}" height="${height}" fill="${element.colors[seriesIndex % element.colors.length]}"/>`;
                })
                .join(""),
        )
        .join("");
      const labels = element.data.categories
        .map(
          (label, labelIndex) =>
            `<text x="${plotX + labelIndex * categoryWidth + categoryWidth / 2}" y="${plotY + plotHeight + 35}" text-anchor="middle" fill="${element.foreground}" font-family="Aptos, 'Microsoft YaHei', sans-serif" font-size="18">${escapeXml(label)}</text>`,
        )
        .join("");
      return `<g>${grid}${marks}${labels}</g>`;
    }
    if (element.kind === "table") {
      const rows = [element.data.headers, ...element.data.rows];
      const rowHeight = element.height / Math.max(rows.length, 1);
      const columnWidth = element.width / element.data.headers.length;
      return rows
        .map((row, rowIndex) =>
          row
            .map((cell, columnIndex) => {
              const x = element.x + columnIndex * columnWidth;
              const y = element.y + rowIndex * rowHeight;
              const fill = rowIndex === 0 ? element.headerColor : element.muted;
              const opacity = rowIndex === 0 ? 0.9 : rowIndex % 2 ? 0.08 : 0.14;
              return `<g><rect x="${x}" y="${y}" width="${columnWidth}" height="${rowHeight}" fill="${fill}" opacity="${opacity}"/><text x="${x + 16}" y="${y + Math.min(34, rowHeight * 0.6)}" fill="${element.foreground}" font-family="Aptos, 'Microsoft YaHei', sans-serif" font-size="20" font-weight="${rowIndex === 0 ? 700 : 400}">${escapeXml(cell)}</text></g>`;
            })
            .join(""),
        )
        .join("");
    }
    if (element.kind === "image") {
      return `<image href="${escapeXml(element.assetUrl)}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    const opacity = element.opacity ?? 1;
    if (element.kind === "line") {
      return `<line x1="${element.x}" y1="${element.y}" x2="${element.x + element.width}" y2="${element.y + element.height}" stroke="${element.color}" stroke-width="${element.lineWidth ?? 1}" opacity="${opacity}"/>`;
    }
    return element.kind === "ellipse"
      ? `<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${element.color}" opacity="${opacity}"/>`
      : `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${element.color}" opacity="${opacity}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ir.width}" height="${ir.height}" viewBox="0 0 ${ir.width} ${ir.height}">${elements.join("")}</svg>`;
}

function toPptX(value: number) {
  return (value / SLIDE_WIDTH) * PPT_WIDTH;
}

function toPptY(value: number) {
  return (value / SLIDE_HEIGHT) * PPT_HEIGHT;
}

function addNativeElement(pptx: PptxGenJS, slide: PptxGenJS.Slide, element: PresentationElement) {
  if (element.kind === "text") {
    slide.addText(element.value, {
      x: toPptX(element.x),
      y: toPptY(element.y),
      w: toPptX(element.width),
      h: toPptY(element.height),
      fontFace: element.fontFamily,
      fontSize: element.fontSize * 0.6,
      color: hex(element.color),
      bold: element.weight >= 600,
      margin: 0,
      fit: "shrink",
      valign: "top",
      align: element.align ?? "left",
      lineSpacingMultiple: element.lineHeight,
      isTextBox: true,
    });
    return;
  }
  if (element.kind === "chart") {
    const chartType =
      element.data.type === "bar"
        ? pptx.ChartType.bar
        : element.data.type === "pie"
          ? pptx.ChartType.pie
          : pptx.ChartType.line;
    slide.addChart(
      chartType,
      element.data.series.map((series) => ({
        name: series.name,
        labels: element.data.categories,
        values: series.values,
      })),
      {
        x: toPptX(element.x),
        y: toPptY(element.y),
        w: toPptX(element.width),
        h: toPptY(element.height),
        showLegend: element.data.series.length > 1,
        showTitle: false,
        chartColors: element.colors.map(hex),
        catAxisLabelColor: hex(element.foreground),
        valAxisLabelColor: hex(element.foreground),
        showLabel: element.data.type === "pie",
        showPercent: element.data.type === "pie",
        showValue: element.data.type !== "pie",
        showLeaderLines: true,
        legendColor: hex(element.foreground),
      },
    );
    return;
  }
  if (element.kind === "table") {
    const rows = [element.data.headers, ...element.data.rows].map((row, rowIndex) =>
      row.map((cell) => ({
        text: cell,
        options: {
          bold: rowIndex === 0,
          color: hex(element.foreground),
          fill: {
            color: hex(rowIndex === 0 ? element.headerColor : element.muted),
            transparency: rowIndex === 0 ? 10 : rowIndex % 2 ? 92 : 86,
          },
          margin: 0.08,
          valign: "middle" as const,
        },
      })),
    );
    slide.addTable(rows, {
      x: toPptX(element.x),
      y: toPptY(element.y),
      w: toPptX(element.width),
      h: toPptY(element.height),
      border: { type: "solid", color: hex(element.muted), pt: 0.5 },
      fontFace: "Aptos",
      fontSize: 14,
      color: hex(element.foreground),
      margin: 0.08,
      rowH: toPptY(element.height) / Math.max(rows.length, 1),
    });
    return;
  }
  if (element.kind === "image") {
    slide.addImage({
      path: path.join(
        process.cwd(),
        "generated-files",
        "template-assets",
        element.templateId,
        element.assetId,
      ),
      x: toPptX(element.x),
      y: toPptY(element.y),
      w: toPptX(element.width),
      h: toPptY(element.height),
    });
    return;
  }
  const common = {
    x: toPptX(element.x),
    y: toPptY(element.y),
    w: toPptX(element.width),
    h: toPptY(element.height),
  };
  if (element.kind === "line") {
    slide.addShape(pptx.ShapeType.line, {
      ...common,
      line: {
        color: hex(element.color),
        transparency: Math.round((1 - (element.opacity ?? 1)) * 100),
        width: element.lineWidth ?? 1,
      },
    });
    return;
  }
  slide.addShape(element.kind === "ellipse" ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
    ...common,
    fill: {
      color: hex(element.color),
      transparency: Math.round((1 - (element.opacity ?? 1)) * 100),
    },
    line: { color: hex(element.color), transparency: 100 },
  });
}

export async function writePresentation({
  outputPath,
  title,
  subtitle,
  theme = "tech",
  design,
  brand,
  masterProfile,
  slides,
}: {
  outputPath: string;
  title: string;
  subtitle?: string;
  theme?: PresentationTheme;
  design?: PresentationDesign;
  brand?: PresentationBrand;
  masterProfile?: PresentationMasterProfile;
  slides: PresentationSlide[];
}) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Agent Shell";
  pptx.subject = title;
  pptx.title = title;
  pptx.company = "Agent Shell";
  const slideModels = slides.map((slideData, index) => {
    const ir = buildPresentationSlide({
      deckTitle: title,
      deckSubtitle: subtitle,
      theme,
      design,
      brand,
      masterProfile,
      slide: slideData,
      index,
    });
    return { ir, issues: validatePresentationSlide(ir, index) };
  });
  const issues = slideModels.flatMap((model) => model.issues);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length) {
    throw new Error(`Presentation layout validation failed: ${errors[0].message}`);
  }
  slideModels.forEach(({ ir }) => {
    const slide = pptx.addSlide();
    ir.elements.forEach((element) => addNativeElement(pptx, slide, element));
  });
  await pptx.writeFile({ fileName: outputPath, compression: true });
  return { issues };
}
