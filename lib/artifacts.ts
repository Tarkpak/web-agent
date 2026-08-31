export type PresentationSlide = {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  layout?: PresentationLayout;
  templateId?: string;
  chart?: PresentationChart;
  table?: PresentationTable;
  section?: string;
  layoutReason?: string;
  layoutAlternatives?: PresentationLayout[];
};

export type PresentationLayout =
  | "cover"
  | "statement"
  | "split"
  | "list"
  | "comparison"
  | "timeline"
  | "quote"
  | "closing"
  | "chart"
  | "table";

export type PresentationChart = {
  type: "bar" | "line" | "pie";
  categories: string[];
  series: Array<{ name: string; values: number[] }>;
};

export type PresentationTable = {
  headers: string[];
  rows: string[][];
};

export type PresentationBrand = {
  name?: string;
  logoText?: string;
  titleFont?: string;
  bodyFont?: string;
  footer?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  accent?: string;
  secondary?: string;
};

export type PresentationMasterDecoration =
  | {
      kind: "rect" | "ellipse";
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
    }
  | {
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
      align?: "left" | "center" | "right";
    }
  | {
      kind: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      assetId: string;
      assetUrl: string;
    };

export type PresentationMasterProfile = {
  id: string;
  sourceName: string;
  slideSize: { width: number; height: number };
  masterNames: string[];
  layoutNames: string[];
  colors: string[];
  fonts: { major?: string; minor?: string };
  assetCount: number;
  decorations: PresentationMasterDecoration[];
  warnings: string[];
};

export type PresentationDesign = {
  name: string;
  mood: string;
  rationale: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  secondary: string;
  typography: "modern" | "editorial" | "technical" | "friendly";
  composition: "bold" | "editorial" | "structured" | "cinematic";
  density: "airy" | "balanced" | "dense";
};

export type PresentationQualityIssue = {
  slide: number;
  severity: "warning" | "error";
  code: "OUT_OF_BOUNDS" | "TEXT_OVERFLOW" | "SMALL_TEXT" | "SLOT_OVERFLOW" | "DATA_MISMATCH";
  message: string;
};

export type PresentationNarrativeQuality = {
  score: number;
  dimensions: {
    structure: number;
    pacing: number;
    density: number;
    variety: number;
  };
  strengths: string[];
  suggestions: string[];
};

export type ArtifactKind =
  | "markdown"
  | "html"
  | "code"
  | "text"
  | "image"
  | "pdf"
  | "file"
  | "presentation";

export type Artifact = {
  title: string;
  kind: ArtifactKind;
  language?: string;
  content?: string;
  path?: string;
  mimeType?: string;
  previewUrl?: string;
  size?: number;
  modifiedAt?: string;
  slides?: PresentationSlide[];
  subtitle?: string;
  theme?: "tech" | "light" | "dark";
  design?: PresentationDesign;
  brand?: PresentationBrand;
  masterProfile?: PresentationMasterProfile;
  generationStatus?: "drafting" | "building" | "ready" | "error";
  generationError?: string;
  previewUrls?: string[];
  qualityIssues?: PresentationQualityIssue[];
  narrativeQuality?: PresentationNarrativeQuality;
  fileName?: string;
  downloadUrl?: string;
};
