import { NextResponse } from "next/server";
import {
  classifyModel,
  isHttpUrl,
  resolveOpenAIAuth,
  toWireModelId,
  type CatalogModel,
  type ProviderKind,
} from "@/lib/provider";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    provider?: string;
    baseURL?: string;
    apiKey?: string;
  };
  const provider: ProviderKind = body.provider === "xai" ? "xai" : "openai";
  const auth = resolveOpenAIAuth({
    provider,
    apiKey: body.apiKey,
    baseURL: body.baseURL,
  });

  if (!auth.apiKey) {
    return NextResponse.json(
      { error: "Missing API key.", models: [] },
      { status: 401 },
    );
  }
  if (!isHttpUrl(auth.baseURL)) {
    return NextResponse.json(
      { error: "Base URL must be http or https.", models: [] },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${auth.baseURL.replace(/\/+$/, "")}/models`, {
      headers: { Authorization: `Bearer ${auth.apiKey}` },
    });
    const json = await res.json();
    if (!res.ok) {
      const message =
        json?.error?.message || `Failed to list models (${res.status})`;
      return NextResponse.json({ error: message, models: [] }, { status: 502 });
    }

    const raw = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];
    const models: CatalogModel[] = raw
      .map((item: { id?: string; owned_by?: string }) => {
        const label = typeof item.id === "string" ? item.id : "";
        if (!label) return null;
        const ownedBy = item.owned_by || "";
        return {
          id: toWireModelId(label, ownedBy),
          label,
          ownedBy,
          kind: classifyModel(label),
        } satisfies CatalogModel;
      })
      .filter((item): item is CatalogModel => item != null && item.kind !== "hidden")
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "chat" ? -1 : 1;
        return a.id.localeCompare(b.id);
      });

    return NextResponse.json({ models });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error ? error.cause : undefined;
    const detail =
      cause instanceof Error
        ? cause.message
        : error instanceof Error
          ? error.message
          : "Failed to list models.";
    return NextResponse.json(
      { error: detail, models: [] },
      { status: 502 },
    );
  }
}
