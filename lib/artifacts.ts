export type PresentationSlide = {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
};

export type ArtifactKind = "markdown" | "html" | "code" | "presentation";

export type Artifact = {
  title: string;
  kind: ArtifactKind;
  language?: string;
  content?: string;
  slides?: PresentationSlide[];
  fileName?: string;
  downloadUrl?: string;
};
