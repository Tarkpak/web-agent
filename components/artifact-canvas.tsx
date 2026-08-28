"use client";

import { Button } from "@/components/ui/button";
import type { Artifact } from "@/lib/artifacts";
import { DownloadIcon, XIcon } from "lucide-react";

function PresentationPreview({ artifact }: { artifact: Artifact }) {
  return (
    <div className="grid gap-5 bg-neutral-100 p-5 dark:bg-neutral-950">
      {artifact.slides?.map((slide, index) => (
        <section
          key={`${index}-${slide.title}`}
          className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden border border-black/10 bg-[#07111f] p-[7%] text-white shadow-sm"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-cyan-400" />
          <p className="mb-5 text-xs font-medium text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
          <h3 className="max-w-[90%] text-2xl leading-tight font-semibold sm:text-3xl">
            {slide.title}
          </h3>
          {slide.subtitle ? <p className="mt-3 text-sm text-cyan-100">{slide.subtitle}</p> : null}
          {slide.body ? (
            <p className="mt-6 max-w-[85%] text-sm leading-6 text-neutral-200">{slide.body}</p>
          ) : null}
          {slide.bullets?.length ? (
            <ul className="mt-6 grid max-w-[90%] gap-3 text-sm text-neutral-100 sm:grid-cols-2">
              {slide.bullets.map((bullet) => (
                <li key={bullet} className="border-l-2 border-cyan-400 pl-3 leading-5">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="absolute right-5 bottom-4 text-[10px] text-neutral-500">
            {artifact.title}
          </p>
        </section>
      ))}
    </div>
  );
}

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
        <div className="flex items-center gap-1">
          {artifact.downloadUrl ? (
            <Button
              variant="outline"
              size="sm"
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
          <PresentationPreview artifact={artifact} />
        ) : artifact.kind === "html" ? (
          <iframe
            title={artifact.title}
            sandbox="allow-scripts"
            className="h-full min-h-[480px] w-full bg-white"
            srcDoc={artifact.content ?? ""}
          />
        ) : artifact.kind === "markdown" ? (
          <pre className="p-5 font-sans text-sm leading-6 whitespace-pre-wrap">
            {artifact.content ?? ""}
          </pre>
        ) : (
          <pre className="p-5 font-mono text-[13px] leading-6 whitespace-pre-wrap">
            {artifact.content ?? ""}
          </pre>
        )}
      </div>
    </aside>
  );
}
