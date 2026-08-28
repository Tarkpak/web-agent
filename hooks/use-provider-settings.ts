"use client";

import {
  DEFAULT_PROVIDER_SETTINGS,
  PROVIDER_STORAGE_KEY,
  type ProviderSettings,
} from "@/lib/provider";
import { useCallback, useEffect, useState } from "react";

export type ProviderEnvHints = {
  hasOpenAIKey: boolean;
  hasXaiKey: boolean;
  defaultBaseURL: string;
  defaultOpenAIModel: string;
  defaultXaiModel: string;
};

const EMPTY_HINTS: ProviderEnvHints = {
  hasOpenAIKey: false,
  hasXaiKey: false,
  defaultBaseURL: "",
  defaultOpenAIModel: "gpt-4.1",
  defaultXaiModel: "grok-4.6",
};

function readStored(): ProviderSettings | null {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    return {
      provider: parsed.provider === "xai" ? "xai" : "openai",
      baseURL: typeof parsed.baseURL === "string" ? parsed.baseURL : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model
          : DEFAULT_PROVIDER_SETTINGS.model,
    };
  } catch {
    return null;
  }
}

export function useProviderSettings() {
  const [settings, setSettings] = useState<ProviderSettings>(
    DEFAULT_PROVIDER_SETTINGS,
  );
  const [hints, setHints] = useState<ProviderEnvHints>(EMPTY_HINTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = readStored();

    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : EMPTY_HINTS))
      .then((data: ProviderEnvHints) => {
        if (cancelled) return;
        setHints(data);
        if (stored) {
          setSettings({
            ...stored,
            baseURL: stored.baseURL || data.defaultBaseURL,
            model:
              stored.model ||
              (stored.provider === "xai"
                ? data.defaultXaiModel
                : data.defaultOpenAIModel),
          });
        } else {
          setSettings({
            provider: "openai",
            baseURL: data.defaultBaseURL,
            apiKey: "",
            model: data.defaultOpenAIModel || DEFAULT_PROVIDER_SETTINGS.model,
          });
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (stored) setSettings(stored);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: ProviderSettings) => {
    setSettings(next);
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { settings, save, hints, ready };
}
