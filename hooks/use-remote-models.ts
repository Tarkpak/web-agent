"use client";

import type { CatalogModel, ProviderSettings } from "@/lib/provider";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRemoteModels(settings: ProviderSettings, enabled = true) {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          provider: settings.provider,
          baseURL: settings.baseURL,
          apiKey: settings.apiKey,
        }),
      });
      const json = (await res.json()) as {
        models?: CatalogModel[];
        error?: string;
      };
      if (requestId !== requestIdRef.current) return;
      if (!res.ok) {
        setModels([]);
        setError(json.error || "Could not load models.");
        return;
      }
      setModels(json.models ?? []);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setModels([]);
      setError(err instanceof Error ? err.message : "Could not load models.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, settings.provider, settings.baseURL, settings.apiKey]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, refresh]);

  return { models, loading, error, refresh };
}
