export type PresentationSlide = {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  layout?: PresentationLayout;
};

export type PresentationLayout =
  | "cover"
  | "statement"
  | "split"
  | "list"
  | "comparison"
  | "timeline"
  | "quote"
  | "closing";

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
  generationStatus?: "drafting" | "building" | "ready" | "error";
  generationError?: string;
  previewUrls?: string[];
  fileName?: string;
  downloadUrl?: string;
};
