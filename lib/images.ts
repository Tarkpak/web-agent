import type { UIMessage } from "ai";

export type GeneratedImage = {
  mediaType: string;
  dataUrl: string;
  b64: string;
};

function stripSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mediaType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  return { mediaType, bytes, blob: new Blob([bytes], { type: mediaType }) };
}

function asDataUrl(mediaType: string, b64: string) {
  return `data:${mediaType};base64,${b64}`;
}

async function readImageResponse(json: unknown): Promise<GeneratedImage> {
  const data = (json as { data?: Array<{ b64_json?: string; url?: string }> }).data;
  const first = data?.[0];
  if (first?.b64_json) {
    return {
      mediaType: "image/png",
      b64: first.b64_json,
      dataUrl: asDataUrl("image/png", first.b64_json),
    };
  }
  if (first?.url) {
    const res = await fetch(first.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const b64 = buf.toString("base64");
    const mediaType = res.headers.get("content-type") || "image/png";
    return { mediaType, b64, dataUrl: asDataUrl(mediaType, b64) };
  }
  throw new Error("Image API returned no image data.");
}

export function extractUserImages(messages: UIMessage[]) {
  const images: Array<{ blob: Blob; name: string; mediaType: string }> = [];
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const part of message.parts ?? []) {
      const record = part as {
        type?: string;
        mediaType?: string;
        url?: string;
        image?: string;
        filename?: string;
      };
      const url =
        record.type === "file" && record.mediaType?.startsWith("image/")
          ? record.url
          : record.type === "image"
            ? record.image
            : undefined;
      if (!url) continue;
      const parsed = url.startsWith("data:") ? dataUrlToBlob(url) : null;
      if (parsed) {
        images.push({
          blob: parsed.blob,
          mediaType: parsed.mediaType,
          name: record.filename || `image.${parsed.mediaType.split("/")[1] || "png"}`,
        });
      }
    }
  }
  return images;
}

export function lastUserText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? String(part.text) : ""))
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function generateOpenAIImage(input: {
  baseURL: string;
  apiKey: string;
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
}) {
  const res = await fetch(`${stripSlash(input.baseURL)}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      n: 1,
      ...(input.size ? { size: input.size } : {}),
      ...(input.quality ? { quality: input.quality } : {}),
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message || `Image generation failed (${res.status})`;
    throw new Error(message);
  }
  return readImageResponse(json);
}

export async function editOpenAIImage(input: {
  baseURL: string;
  apiKey: string;
  model: string;
  prompt: string;
  images: Array<{ blob: Blob; name: string }>;
  size?: string;
}) {
  if (input.images.length === 0) {
    throw new Error("Attach at least one image to edit.");
  }
  const form = new FormData();
  form.set("model", input.model);
  form.set("prompt", input.prompt);
  if (input.size) form.set("size", input.size);
  input.images.forEach((image, index) => {
    form.append("image[]", image.blob, image.name);
    if (index === 0) form.append("image", image.blob, image.name);
  });
  const res = await fetch(`${stripSlash(input.baseURL)}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message || `Image edit failed (${res.status})`;
    throw new Error(message);
  }
  return readImageResponse(json);
}
