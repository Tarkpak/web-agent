"use client";

import type { ComponentProps } from "react";
import { FileIcon, FolderIcon, LoaderCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/components/assistant-ui/elements/file";
import { mono, paper } from "./surfaces";

export type FileTreeNode = {
  path: string;
  name: string;
  depth: number;
  kind: "folder" | "file";
  size?: number;
};

export function FileTree({
  nodes,
  visibleCount,
  loading = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  nodes: readonly FileTreeNode[];
  visibleCount: number;
  loading?: boolean;
}) {
  const fileCount = nodes.filter((node) => node.kind === "file").length;
  return (
    <div
      data-slot="file-tree"
      className={cn(paper, "my-2 w-full max-w-md overflow-hidden rounded-lg", className)}
      {...props}
    >
      <div className="border-border/60 flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium">Task files</span>
        <span className={cn(mono, "text-foreground/45 flex items-center gap-1.5")}>
          {loading ? (
            <>
              <LoaderCircleIcon className="size-3 animate-spin" /> Listing
            </>
          ) : (
            `${fileCount} ${fileCount === 1 ? "file" : "files"}`
          )}
        </span>
      </div>
      <div className="max-h-72 overflow-auto py-1.5">
        {nodes.slice(0, Math.max(0, visibleCount)).map((node) => {
          const Icon = node.kind === "folder" ? FolderIcon : FileIcon;
          return (
            <div
              key={node.path}
              className="flex min-h-7 items-center gap-2 px-3 text-xs"
              style={{ paddingInlineStart: `${12 + node.depth * 14}px` }}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  node.kind === "folder" ? "text-amber-600/75" : "text-foreground/40",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  node.kind === "folder" ? "font-medium" : "text-foreground/75",
                )}
              >
                {node.name}
              </span>
              {node.kind === "file" && node.size !== undefined ? (
                <span className={cn(mono, "text-foreground/35 shrink-0")}>
                  {formatFileSize(node.size)}
                </span>
              ) : null}
            </div>
          );
        })}
        {!loading && nodes.length === 0 ? (
          <p className="text-foreground/45 px-3 py-3 text-xs">No task files found</p>
        ) : null}
      </div>
    </div>
  );
}

export function buildFileTree(files: readonly { path: string; size?: number }[]): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const segments = file.path.replaceAll("\\", "/").split("/").filter(Boolean);
    for (let index = 0; index < segments.length - 1; index += 1) {
      const path = segments.slice(0, index + 1).join("/");
      if (!seen.has(path)) {
        seen.add(path);
        nodes.push({ path, name: segments[index] ?? path, depth: index, kind: "folder" });
      }
    }
    const name = segments.at(-1) ?? file.path;
    nodes.push({
      path: file.path,
      name,
      depth: Math.max(0, segments.length - 1),
      kind: "file",
      size: file.size,
    });
  }
  return nodes;
}
