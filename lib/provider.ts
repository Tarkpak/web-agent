export type ProviderKind = "openai" | "xai";

export type ProviderSettings = {
  provider: ProviderKind;
  baseURL: string;
  apiKey: string;
  model: string;
};

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  provider: "openai",
  baseURL: "",
  apiKey: "",
  model: "",
};

export const PROVIDER_STORAGE_KEY = "agent-shell.provider";

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeModelId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 200);
}

export type ModelKind = "chat" | "image" | "hidden";

export type CatalogModel = {
  id: string;
  label: string;
  ownedBy: string;
  kind: ModelKind;
};

export function toWireModelId(id: string, _ownedBy?: string) {
  // The OpenAI-compatible /v1/models `id` is the exact value to send in
  // chat requests. `owned_by` is metadata only — never prefix it, or
  // gateways that expect bare ids fail with "unknown provider for model".
  // Ids that already carry a vendor prefix (e.g. "openai/gpt-4o") pass
  // through untouched.
  return id.trim();
}

export function classifyModel(id: string): ModelKind {
  const n = id.toLowerCase();
  if (
    /(embed|text-embedding|ada-002|whisper|tts-|tts_|moderation|omni-moderation|realtime|video)/.test(
      n,
    )
  ) {
    return "hidden";
  }
  if (/(image|imagine|dall-e|dalle|imagen|flux|sdxl|seedream|ideogram)/.test(n)) {
    return "image";
  }
  return "chat";
}

export function resolveOpenAIAuth(input: {
  apiKey?: string;
  baseURL?: string;
  provider: ProviderKind;
}) {
  const clientKey = input.apiKey?.trim() ?? "";
  const clientBaseURL = input.baseURL?.trim() ?? "";
  if (input.provider === "xai") {
    return {
      apiKey: clientKey,
      baseURL: rewriteLocalhost("https://api.x.ai/v1"),
    };
  }
  return {
    apiKey: clientKey,
    baseURL: rewriteLocalhost(clientBaseURL || "https://api.openai.com/v1"),
  };
}

function rewriteLocalhost(url: string) {
  return url.replace("://localhost", "://127.0.0.1");
}
