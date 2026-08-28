export type ArtifactKind = "markdown" | "html" | "code";

export type Artifact = {
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
};
