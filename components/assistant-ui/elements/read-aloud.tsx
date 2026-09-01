"use client";

import { useEffect, useMemo, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { cycleReadAloudRate, useReadAloudState } from "@/lib/read-aloud-speech-adapter";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ReadAloudPanel() {
  const aui = useAui();
  const speech = useAuiState((s) => s.message.speech);
  const messageText = useAuiState((s) =>
    s.message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" "),
  );
  const playback = useReadAloudState();
  const [elapsed, setElapsed] = useState(0);
  const playing = speech?.status.type === "running" || speech?.status.type === "starting";
  const active = playing && playback.text === messageText;

  useEffect(() => {
    if (!active || playback.startedAt === null) return;
    const update = () => setElapsed(Math.floor((Date.now() - playback.startedAt!) / 1000));
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [active, playback.startedAt]);

  const words = useMemo(
    () =>
      Array.from(messageText.matchAll(/\S+/g), (match) => ({ text: match[0], start: match.index })),
    [messageText],
  );
  const spokenIndex = Math.max(
    0,
    words.findLastIndex((word) => word.start <= playback.charIndex),
  );
  if (!speech || !messageText) return null;

  return (
    <div data-slot="read-aloud" className={cn(field, "my-2 rounded-md p-3")}>
      <p className="max-h-20 overflow-y-auto text-sm leading-6">
        {words.map((word, index) => (
          <span
            key={`${word.start}-${word.text}`}
            className={cn(
              "rounded-sm px-0.5",
              active && index < spokenIndex && "text-muted-foreground",
              active && index === spokenIndex && "bg-amber-300/40",
            )}
          >
            {word.text}{" "}
          </span>
        ))}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          className="hover:bg-background flex size-7 items-center justify-center rounded-full"
          onClick={() => (playing ? aui.message.stopSpeaking() : aui.message.speak())}
        >
          {playing ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
        </button>
        <span className="bg-muted h-1 min-w-16 flex-1 overflow-hidden rounded-full">
          <span
            className="bg-foreground block h-full transition-[width]"
            style={{ width: `${words.length ? ((spokenIndex + 1) / words.length) * 100 : 0}%` }}
          />
        </span>
        <span className={cn(mono, "text-muted-foreground tabular-nums")}>
          {formatTime(elapsed)} / --:--
        </span>
        <button
          type="button"
          className={cn(mono, "hover:bg-background rounded-sm px-1.5 py-1")}
          onClick={() => {
            cycleReadAloudRate();
            if (playing) {
              aui.message.stopSpeaking();
              queueMicrotask(() => aui.message.speak());
            }
          }}
        >
          {playback.rate}x
        </button>
      </div>
    </div>
  );
}
