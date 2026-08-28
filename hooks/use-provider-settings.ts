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
    };
  } catch {
    return null;
  }
}

export function useProviderSettings() {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);

  useEffect(() => {
    const stored = readStored();
    if (stored) setSettings(stored);
  }, []);

  const save = useCallback((next: ProviderSettings) => {
    setSettings(next);
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { settings, save };
}
