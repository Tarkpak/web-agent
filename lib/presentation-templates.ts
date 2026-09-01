import type { PresentationLayout } from "@/lib/artifacts";

export type PresentationSlot = {
  accepts: "text" | "list" | "chart" | "table";
  bounds?: { x: number; y: number; width: number; height: number };
  maxCharacters?: number;
  maxItems?: number;
};

export type PresentationTemplate = {
  id: string;
  name: string;
  layout: PresentationLayout;
  safeArea: { x: number; y: number; width: number; height: number };
  slots: Record<string, PresentationSlot>;
};

const commonSafeArea = { x: 70, y: 45, width: 1460, height: 810 };

export const PRESENTATION_TEMPLATES: readonly PresentationTemplate[] = [
  {
    id: "cover-accent-rail",
    name: "Accent rail cover",
    layout: "cover",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 110, y: 245, width: 820, height: 190 },
        maxCharacters: 54,
      },
      subtitle: {
        accepts: "text",
        bounds: { x: 110, y: 455, width: 800, height: 100 },
        maxCharacters: 90,
      },
    },
  },
  {
    id: "statement-focus",
    name: "Focused statement",
    layout: "statement",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 150, y: 300, width: 1290, height: 280 },
        maxCharacters: 90,
      },
      body: {
        accepts: "text",
        bounds: { x: 155, y: 620, width: 1050, height: 105 },
        maxCharacters: 180,
      },
    },
  },
  {
    id: "split-narrative-list",
    name: "Narrative and points",
    layout: "split",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      body: {
        accepts: "text",
        bounds: { x: 90, y: 300, width: 530, height: 430 },
        maxCharacters: 420,
      },
      bullets: {
        accepts: "list",
        bounds: { x: 760, y: 300, width: 720, height: 430 },
        maxItems: 6,
        maxCharacters: 240,
      },
    },
  },
  {
    id: "numbered-list",
    name: "Numbered list",
    layout: "list",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      bullets: {
        accepts: "list",
        bounds: { x: 110, y: 300, width: 1310, height: 490 },
        maxItems: 6,
        maxCharacters: 300,
      },
    },
  },
  {
    id: "two-column-comparison",
    name: "Two-column comparison",
    layout: "comparison",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      bullets: {
        accepts: "list",
        bounds: { x: 115, y: 390, width: 1350, height: 355 },
        maxItems: 6,
        maxCharacters: 300,
      },
    },
  },
  {
    id: "milestone-timeline",
    name: "Milestone timeline",
    layout: "timeline",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      bullets: {
        accepts: "list",
        bounds: { x: 150, y: 440, width: 1300, height: 300 },
        maxItems: 5,
        maxCharacters: 180,
      },
    },
  },
  {
    id: "editorial-quote",
    name: "Editorial quote",
    layout: "quote",
    safeArea: commonSafeArea,
    slots: {
      body: {
        accepts: "text",
        bounds: { x: 250, y: 265, width: 1120, height: 350 },
        maxCharacters: 260,
      },
      subtitle: {
        accepts: "text",
        bounds: { x: 255, y: 680, width: 850, height: 45 },
        maxCharacters: 80,
      },
    },
  },
  {
    id: "closing-halo",
    name: "Closing halo",
    layout: "closing",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 260, y: 320, width: 1080, height: 180 },
        maxCharacters: 60,
      },
      body: {
        accepts: "text",
        bounds: { x: 350, y: 530, width: 900, height: 130 },
        maxCharacters: 160,
      },
    },
  },
  {
    id: "data-chart",
    name: "Editable data chart",
    layout: "chart",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      chart: {
        accepts: "chart",
        bounds: { x: 110, y: 285, width: 1380, height: 500 },
        maxItems: 12,
      },
    },
  },
  {
    id: "data-table",
    name: "Editable data table",
    layout: "table",
    safeArea: commonSafeArea,
    slots: {
      title: {
        accepts: "text",
        bounds: { x: 90, y: 125, width: 1380, height: 70 },
        maxCharacters: 48,
      },
      table: {
        accepts: "table",
        bounds: { x: 110, y: 285, width: 1380, height: 500 },
        maxItems: 8,
      },
    },
  },
] as const;

export function resolvePresentationTemplate(layout: PresentationLayout, templateId?: string) {
  if (templateId) {
    const template = PRESENTATION_TEMPLATES.find((item) => item.id === templateId);
    if (template && template.layout === layout) return template;
  }
  return PRESENTATION_TEMPLATES.find((item) => item.layout === layout)!;
}
