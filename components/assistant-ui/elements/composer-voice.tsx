"use client";

import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { AuiIf, ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import { MicIcon, SquareIcon } from "lucide-react";
import { useEffect, useState } from "react";

const BAR_HEIGHTS = [35, 58, 82, 48, 72, 95, 62, 88, 54, 76, 44, 68, 86, 52] as const;

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function DictationStatus() {
  const status = useAuiState((state) => state.composer.dictation?.status.type);
  const [seconds, setSeconds] = useState(0);
  const recording = status === "starting" || status === "running";

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  return (
    <div
      data-slot="composer-voice"
      data-recording={recording}
      className="bg-muted/45 flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-lg px-3"
      role="status"
      aria-label={recording ? `Recording, ${formatElapsed(seconds)}` : "Transcribing"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "bg-destructive size-2 shrink-0 rounded-full",
          recording && "animate-pulse motion-reduce:animate-none",
        )}
      />
      <div aria-hidden="true" className="flex h-5 min-w-14 items-center gap-0.5">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className={cn(
              "bg-foreground/45 block w-0.5 rounded-full transition-transform",
              recording && "animate-pulse motion-reduce:animate-none",
            )}
            style={{
              height: `${height}%`,
              animationDelay: `${index * 55}ms`,
              animationDuration: "900ms",
            }}
          />
        ))}
      </div>
      <ComposerPrimitive.DictationTranscript className="text-foreground/70 min-w-0 flex-1 truncate text-sm" />
      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {recording ? formatElapsed(seconds) : "Transcribing"}
      </span>
    </div>
  );
}

export function ComposerVoiceInput() {
  return (
    <AuiIf condition={(state) => state.thread.capabilities.dictation}>
      <AuiIf condition={(state) => state.composer.dictation == null}>
        <ComposerPrimitive.Dictate
          render={
            <TooltipIconButton
              tooltip="Voice input"
              side="bottom"
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-7 rounded-full"
              aria-label="Start voice input"
            />
          }
        >
          <MicIcon className="size-4" />
        </ComposerPrimitive.Dictate>
      </AuiIf>
      <AuiIf condition={(state) => state.composer.dictation != null}>
        <ComposerPrimitive.StopDictation
          render={
            <TooltipIconButton
              tooltip="Stop dictation"
              side="bottom"
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive size-7 rounded-full"
              aria-label="Stop voice input"
            />
          }
        >
          <SquareIcon className="size-3.5 fill-current" />
        </ComposerPrimitive.StopDictation>
      </AuiIf>
    </AuiIf>
  );
}

export function ComposerDictationStatus() {
  return (
    <AuiIf condition={(state) => state.composer.dictation != null}>
      <DictationStatus />
    </AuiIf>
  );
}
