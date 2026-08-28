import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasXaiKey: Boolean(process.env.XAI_API_KEY),
    defaultBaseURL: process.env.OPENAI_BASE_URL ?? "",
    defaultOpenAIModel: process.env.OPENAI_MODEL || "gpt-4.1",
    defaultXaiModel: process.env.XAI_MODEL || "grok-4.6",
  });
}
