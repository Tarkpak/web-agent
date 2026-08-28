"use client";

import { Button } from "@/components/ui/button";
import type { Artifact } from "@/lib/artifacts";
import { XIcon } from "lucide-react";

export function ArtifactCanvas({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  return (
    <aside className="bg-background flex h-full min-w-0 flex-1 flex-col border-s">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {artifact.kind}
            {artifact.language ? ` / ${artifact.language}` : ""}
          </p>
          <h2 className="truncate text-sm font-medium">{artifact.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close canvas">
          <XIcon className="size-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {artifact.kind === "html" ? (
          <iframe
            title={artifact.title}
            sandbox="allow-scripts"
            className="h-full min-h-[480px] w-full bg-white"
            srcDoc={artifact.content}
          />
        ) : artifact.kind === "markdown" ? (
          <pre className="p-5 font-sans text-sm leading-6 whitespace-pre-wrap">
            {artifact.content}
          </pre>
        ) : (
          <pre className="p-5 font-mono text-[13px] leading-6 whitespace-pre-wrap">
            {artifact.content}
          </pre>
        )}
      </div>
    </aside>
  );
}
