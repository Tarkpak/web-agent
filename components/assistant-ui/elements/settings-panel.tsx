"use client";

import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export type SettingToggle = { key: string; label: string; detail: string; on: boolean };
export type SettingsModel = { id: string; label: string };

export function SettingsPanel({
  model,
  models,
  systemPrompt,
  temperature,
  toggles,
  onModelChange,
  onSystemPromptChange,
  onTemperatureChange,
  onToggle,
  className,
}: {
  model: string;
  models: readonly SettingsModel[];
  systemPrompt: string;
  temperature: number;
  toggles: readonly SettingToggle[];
  onModelChange?: (model: string) => void;
  onSystemPromptChange?: (prompt: string) => void;
  onTemperatureChange?: (temperature: number) => void;
  onToggle?: (key: string) => void;
  className?: string;
}) {
  const value = Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : 0;
  return (
    <div data-slot="settings-panel" className={cn(paper, "grid gap-4 rounded-lg p-3", className)}>
      <section className="grid gap-2">
        <span className={cn(mono, "text-muted-foreground uppercase")}>Model</span>
        <div className={cn(field, "flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md p-1")}>
          {models.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === model}
              onClick={() => onModelChange?.(option.id)}
              className="aria-pressed:bg-background aria-pressed:text-foreground text-muted-foreground hover:text-foreground rounded-sm px-2.5 py-1.5 text-xs aria-pressed:shadow-sm"
            >
              <span className="block max-w-48 truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </section>
      <label className="grid gap-2">
        <span className={cn(mono, "text-muted-foreground uppercase")}>System prompt</span>
        <textarea
          aria-label="System prompt"
          value={systemPrompt}
          onChange={(event) => onSystemPromptChange?.(event.target.value)}
          placeholder="Additional instructions for every response"
          className={cn(
            field,
            "min-h-24 resize-y rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2",
          )}
        />
      </label>
      <label className="grid gap-2">
        <span className={cn(mono, "text-muted-foreground flex justify-between uppercase")}>
          Temperature <span>{value.toFixed(1)}</span>
        </span>
        <input
          type="range"
          aria-label="Temperature"
          min={0}
          max={2}
          step={0.1}
          value={value}
          onChange={(event) => onTemperatureChange?.(Number(event.target.value))}
          className="accent-foreground"
        />
      </label>
      <section className="grid gap-1">
        <span className={cn(mono, "text-muted-foreground mb-1 uppercase")}>Capabilities</span>
        {toggles.map((toggle) => (
          <div key={toggle.key} className="flex items-center justify-between gap-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm">{toggle.label}</p>
              <p className="text-muted-foreground text-xs">{toggle.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggle.on}
              aria-label={toggle.label}
              onClick={() => onToggle?.(toggle.key)}
              className="bg-muted aria-checked:bg-foreground relative h-5 w-9 shrink-0 rounded-full transition-colors"
            >
              <span
                className={cn(
                  "bg-background absolute top-0.5 left-0.5 size-4 rounded-full shadow-sm transition-transform",
                  toggle.on && "translate-x-4",
                )}
              />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
