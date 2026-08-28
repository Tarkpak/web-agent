import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type JSONSchema7,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  editOpenAIImage,
  extractUserImages,
  generateOpenAIImage,
  lastUserText,
} from "@/lib/images";
import {
  classifyModel,
  isHttpUrl,
  resolveOpenAIAuth,
  sanitizeModelId,
} from "@/lib/provider";
import toolkit from "../../toolkit";

export const maxDuration = 300;

const aiToolkit = new AISDKToolkit({ toolkit });

function systemPrompt(provider: "openai" | "xai") {
  const shared = `You are the Agent Shell assistant, a capable coding and research agent.
You can look at user-attached images.
Use generate_image to create a new image from a prompt.
Use edit_image to change or restyle images the user attached.
Use present_artifact to show HTML pages, markdown docs, or code in the canvas.
Use confirm_plan before multi-step or destructive work the user did not already approve.
Use get_current_time when the user asks about the date or time.
Prefer tools over guessing. Keep answers tight.`;

  if (provider === "xai") {
    return `${shared}
Use web_search for current events and live facts.
Use x_search for posts on X.
Use code_execution for calculations, parsing, and small programs.
Cite sources when you searched.`;
  }

  return shared;
}

function imageMessageResponse(image: {
  dataUrl: string;
  mediaType: string;
}, caption: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: "file",
        url: image.dataUrl,
        mediaType: image.mediaType,
      });
      writer.write({ type: "text-start", id: "caption" });
      writer.write({ type: "text-delta", id: "caption", delta: caption });
      writer.write({ type: "text-end", id: "caption" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    model: requestedModel,
    imageModel: requestedImageModel,
    provider: requestedProvider,
    baseURL: requestedBaseURL,
    apiKey: requestedApiKey,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    model?: string;
    imageModel?: string;
    provider?: string;
    baseURL?: string;
    apiKey?: string;
  } = await req.json();

  const provider = requestedProvider === "xai" ? "xai" : "openai";
  const modelId = sanitizeModelId(requestedModel);
  const imageModelId =
    sanitizeModelId(requestedImageModel) || "gpt-image-2";
  const auth = resolveOpenAIAuth({
    provider,
    apiKey: requestedApiKey,
    baseURL: requestedBaseURL,
  });

  if (!auth.apiKey) {
    return Response.json(
      { error: "Missing API key. Set it in Settings or .env.local." },
      { status: 500 },
    );
  }
  if (auth.baseURL && !isHttpUrl(auth.baseURL)) {
    return Response.json({ error: "Base URL must be http or https." }, { status: 400 });
  }

  const toolkitTools = await aiToolkit.tools({ frontend: tools });

  if (provider === "openai" && classifyModel(modelId || imageModelId) === "image") {
    try {
      const prompt = lastUserText(messages) || "Generate an image.";
      const refs = extractUserImages(messages);
      const image = refs.length
        ? await editOpenAIImage({
            baseURL: auth.baseURL,
            apiKey: auth.apiKey,
            model: modelId || imageModelId,
            prompt,
            images: refs,
          })
        : await generateOpenAIImage({
            baseURL: auth.baseURL,
            apiKey: auth.apiKey,
            model: modelId || imageModelId,
            prompt,
          });
      return imageMessageResponse(
        image,
        refs.length ? "Edited image." : "Generated image.",
      );
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }

  const imageTools = {
    generate_image: tool({
      description:
        "Generate a new image from a text prompt using the Images API (gpt-image-2 or similar).",
      inputSchema: z.object({
        prompt: z.string().describe("Image description"),
        size: z.string().optional(),
        quality: z.enum(["low", "medium", "high", "auto"]).optional(),
      }),
      execute: async ({ prompt, size, quality }) => {
        const image = await generateOpenAIImage({
          baseURL: auth.baseURL,
          apiKey: auth.apiKey,
          model: imageModelId,
          prompt,
          size,
          quality,
        });
        return { dataUrl: image.dataUrl, mediaType: image.mediaType, prompt };
      },
    }),
    edit_image: tool({
      description:
        "Edit or restyle images the user attached, using gpt-image-2 or a similar Images API model.",
      inputSchema: z.object({
        prompt: z.string().describe("How to change the attached image"),
        size: z.string().optional(),
      }),
      execute: async ({ prompt, size }) => {
        const refs = extractUserImages(messages);
        const image = await editOpenAIImage({
          baseURL: auth.baseURL,
          apiKey: auth.apiKey,
          model: imageModelId,
          prompt,
          images: refs,
          size,
        });
        return { dataUrl: image.dataUrl, mediaType: image.mediaType, prompt };
      },
    }),
  };

  if (provider === "xai") {
    const xai = createXai({ apiKey: auth.apiKey });
    const result = streamText({
      model: xai.responses(modelId || "grok-4.6"),
      messages: await convertToModelMessages(messages),
      system: [systemPrompt("xai"), system].filter(Boolean).join("\n\n"),
      stopWhen: stepCountIs(12),
      tools: {
        web_search: xai.tools.webSearch(),
        x_search: xai.tools.xSearch(),
        code_execution: xai.tools.codeExecution(),
        ...imageTools,
        ...toolkitTools,
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
      onError: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  }

  const openai = createOpenAI({
    apiKey: auth.apiKey,
    baseURL: auth.baseURL || undefined,
  });

  const result = streamText({
    model: openai.chat(modelId || "gpt-4.1"),
    messages: await convertToModelMessages(messages),
    system: [systemPrompt("openai"), system].filter(Boolean).join("\n\n"),
    stopWhen: stepCountIs(12),
    tools: {
      ...imageTools,
      ...toolkitTools,
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
