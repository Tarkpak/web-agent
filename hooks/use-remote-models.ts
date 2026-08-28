"use client";

import type { CatalogModel, ProviderSettings } from "@/lib/provider";
import { useCallback, useEffect, useState } from "react";

export function useRemoteModels(settings: ProviderSettings) {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!res.ok) {
        setModels([]);
        setError(json.error || "Could not load models.");
        return;
      }
      setModels(json.models ?? []);
    } catch (err) {
      setModels([]);
      setError(err instanceof Error ? err.message : "Could not load models.");
    } finally {
      setLoading(false);
    }
  }, [settings.provider, settings.baseURL, settings.apiKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { models, loading, error, refresh };
}
