"use client";

import {
  DEFAULT_PROVIDER_SETTINGS,
  PROVIDER_STORAGE_KEY,
  type ProviderSettings,
} from "@/lib/provider";
import { useCallback, useEffect, useState } from "react";

function readStored(): ProviderSettings | null {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    return {
      provider: parsed.provider === "xai" ? "xai" : "openai",
      baseURL: typeof parsed.baseURL === "string" ? parsed.baseURL : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      reasoningEffort:
        parsed.reasoningEffort === "low" ||
        parsed.reasoningEffort === "medium" ||
        parsed.reasoningEffort === "high"
          ? parsed.reasoningEffort
          : "medium",
      systemPrompt: typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : "",
      temperature:
        typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)
          ? Math.min(2, Math.max(0, parsed.temperature))
          : 0.7,
      webSearch: parsed.webSearch !== false,
      codeExecution: parsed.codeExecution !== false,
      imageGeneration: parsed.imageGeneration !== false,
    };
  } catch {
    return null;
  }
}

export function useProviderSettings() {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) setSettings(stored);
    setReady(true);
  }, []);

  const save = useCallback((next: ProviderSettings) => {
    setSettings(next);
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { settings, save, ready };
}
