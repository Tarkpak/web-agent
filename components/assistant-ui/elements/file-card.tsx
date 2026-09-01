"use client";

import type { ComponentProps } from "react";
import { DownloadIcon, FileIcon, FolderOpenIcon, LoaderCircleIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, getMimeTypeIcon } from "@/components/assistant-ui/elements/file";
import { ghostButton, mono, paper } from "./surfaces";

export function FileCard({
  name,
  size,
  downloadUrl,
  mimeType,
  action = "file",
  loading = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  name: string;
  size?: number;
  downloadUrl?: string;
  mimeType?: string;
  action?: "file" | "open" | "write";
  loading?: boolean;
}) {
  const MimeIcon = mimeType ? getMimeTypeIcon(mimeType) : FileIcon;
  const Icon = action === "open" ? FolderOpenIcon : action === "write" ? PencilIcon : MimeIcon;
  return (
    <div
      data-slot="file-card"
      className={cn(
        paper,
        "my-2 flex min-h-14 w-full max-w-md items-center gap-3 rounded-lg px-3 py-2.5",
        className,
      )}
      {...props}
    >
      <span className="bg-foreground/[0.05] flex size-8 shrink-0 items-center justify-center rounded-md">
        {loading ? (
          <LoaderCircleIcon className="text-foreground/50 size-4 animate-spin" />
        ) : (
          <Icon className="text-foreground/55 size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{name}</p>
        <p className={cn(mono, "text-foreground/45 mt-0.5")}>
          {loading
            ? action === "write"
              ? "Writing"
              : "Opening"
            : size === undefined
              ? "Ready"
              : formatFileSize(size)}
        </p>
      </div>
      {downloadUrl && !loading ? (
        <a
          href={downloadUrl}
          download
          className={cn(ghostButton, "size-8")}
          aria-label={`Download ${name}`}
        >
          <DownloadIcon className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
