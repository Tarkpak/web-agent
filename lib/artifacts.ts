export type PresentationSlide = {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
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
  generationStatus?: "drafting" | "building" | "ready" | "error";
  generationError?: string;
  fileName?: string;
  downloadUrl?: string;
};
