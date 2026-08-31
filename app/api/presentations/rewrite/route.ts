import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl, resolveOpenAIAuth, sanitizeModelId } from "@/lib/provider";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  provider: z.enum(["openai", "xai"]).default("openai"),
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  deckTitle: z.string().max(160),
  slideTitle: z.string().max(180),
  field: z.enum(["title", "subtitle", "body", "bullet"]),
  text: z.string().min(1).max(2000),
  instruction: z.string().min(1).max(600),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const auth = resolveOpenAIAuth(input);
    if (!auth.apiKey) throw new Error("Missing API key. Set it in Settings.");
    if (auth.baseURL && !isHttpUrl(auth.baseURL)) throw new Error("Base URL must be http or https.");

    const modelId = sanitizeModelId(input.model);
    const model =
      input.provider === "xai"
        ? createXai({ apiKey: auth.apiKey }).responses(modelId || "grok-4.6")
        : createOpenAI({ apiKey: auth.apiKey, baseURL: auth.baseURL || undefined }).chat(
            modelId || "gpt-4.1",
          );
    const { text } = await generateText({
      model,
      system:
        "You edit presentation copy. Return only the replacement text, with no quotes, labels, markdown, or explanation. Preserve facts and the original language unless explicitly asked otherwise.",
      prompt: `Deck: ${input.deckTitle}\nSlide: ${input.slideTitle}\nField: ${input.field}\nInstruction: ${input.instruction}\n\nOriginal text:\n${input.text}`,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not rewrite the selection." },
      { status: 400 },
    );
  }
}
