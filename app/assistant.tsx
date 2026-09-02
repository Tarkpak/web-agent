"use client";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { ShellProvider } from "@/components/shell-context";
import { Thread, type ThreadComponents } from "@/components/assistant-ui/elements/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/elements/thread-list-sidebar";
import { ConversationSearch } from "@/components/assistant-ui/elements/conversation-search";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useProviderSettings } from "@/hooks/use-provider-settings";
import { useRemoteModels } from "@/hooks/use-remote-models";
import type { Artifact } from "@/lib/artifacts";
import { TaskFileAttachmentAdapter } from "@/lib/task-file-attachment-adapter";
import { serverFeedbackAdapter } from "@/lib/feedback-adapter";
import { readAloudSpeechAdapter } from "@/lib/read-aloud-speech-adapter";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  Suggestions,
  Tools,
  WebSpeechDictationAdapter,
  type SpeechSynthesisAdapter,
  useAui,
  useAuiState,
  useAuiToolOverrides,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { serverThreadListAdapter } from "@/lib/server-thread-list-adapter";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import toolkit from "./toolkit";

const attachmentAdapter = new TaskFileAttachmentAdapter();

const STARTERS = Suggestions([
  {
    title: "Search",
    label: "latest Grok news",
    prompt:
      "Search the web for the latest xAI and Grok news and summarize the top 3 items with sources.",
  },
  {
    title: "Plan",
    label: "a local agent stack",
    prompt:
      "Propose a 5-step plan to build a local coding agent. Use confirm_plan before expanding any step.",
  },
  {
    title: "Canvas",
    label: "HTML landing mock",
    prompt:
      "Create a single-file HTML landing page for a personal AI agent and present it on the canvas.",
  },
  {
    title: "Calculate",
    label: "compound growth",
    prompt:
      "Use code execution to compute 10000 USD grown at 8% annually for 20 years. Show a compact year-by-year table.",
  },
]);

function AgentWelcome() {
  return (
    <div className="aui-thread-welcome-root mb-7 flex flex-col items-center px-4 text-center">
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
        <span className="font-mono text-sm font-semibold">A</span>
      </div>
      <h1 className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold tracking-tight duration-200">
        Start with a goal
      </h1>
      <p className="text-muted-foreground fade-in animate-in mt-2 max-w-sm text-sm leading-6 text-pretty duration-200">
        Ask a question, attach source material, or describe what you want the agent to create.
      </p>
    </div>
  );
}

const AGENT_THREAD_COMPONENTS: ThreadComponents = { Welcome: AgentWelcome };

const paintProgressFrame = () =>
  new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 50);
    window.requestAnimationFrame(() => {
      window.clearTimeout(timeout);
      resolve();
    });
  });

function ConversationHeader({
  provider,
  searchOpen,
  onToggleSearch,
}: {
  provider: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
}) {
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const isLoading = useAuiState((s) => s.thread.isLoading || s.threads.isLoading);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const title = threadItems.find((item) => item.id === mainThreadId)?.title || "New conversation";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {isLoading ? "Loading conversation..." : title}
          </p>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px]">
            <span
              className={`size-1.5 rounded-full ${isRunning ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"}`}
              aria-hidden
            />
            <span>
              {isRunning ? "Working" : provider === "xai" ? "xAI Grok" : "OpenAI compatible"}
            </span>
          </div>
        </div>
        <TooltipIconButton
          tooltip="Find in conversation"
          onClick={onToggleSearch}
          aria-pressed={searchOpen}
          className="shrink-0"
        >
          <SearchIcon className="size-4" />
        </TooltipIconButton>
      </div>
    </header>
  );
}

function ArtifactBridge({ onPresent }: { onPresent: (artifact: Artifact) => void }) {
  const runFileAction = async (
    input:
      | { action: "list"; path?: string }
      | { action: "read"; path: string }
      | { action: "write"; path: string; content: string },
  ) => {
    const response = await fetch("/api/task-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Task file operation failed.");
    return result;
  };

  useAuiToolOverrides({
    present_artifact: {
      execute: async (args) => {
        onPresent(args as Artifact);
        return { shown: true };
      },
    },
    list_files: {
      execute: async ({ path }) => runFileAction({ action: "list", path }),
    },
    read_file: {
      execute: async ({ path }) => {
        const result = await runFileAction({ action: "read", path });
        onPresent({ ...result, title: result.name ?? result.path } as Artifact);
        return result;
      },
    },
    write_file: {
      execute: async ({ path, content }) => {
        const result = await runFileAction({ action: "write", path, content });
        onPresent({ ...result, title: result.name ?? result.path } as Artifact);
        return result;
      },
    },
    create_presentation: {
      execute: async (args) => {
        const baseArtifact = {
          kind: "presentation",
          title: args.title,
          subtitle: args.subtitle,
          theme: args.theme ?? "tech",
          design: args.design,
          brand: args.brand,
          slides: args.slides,
          generationStatus: "building",
          generationStage: "layout",
          generationStageIndex: 0,
          generationProgress: 0,
          generationMessage: "Preparing the presentation structure",
          previewUrls: [],
        } as Artifact;
        let currentArtifact = baseArtifact;
        onPresent(baseArtifact);
        try {
          const response = await fetch("/api/presentations?stream=1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Could not create the PowerPoint file.");
          }

          if (!response.body) throw new Error("Presentation progress stream was unavailable.");
          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = "";
          let finalResult: Record<string, any> | undefined;
          while (true) {
            const { value, done } = await reader.read();
            buffer += value ?? "";
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              const event = JSON.parse(line) as Record<string, any>;
              if (event.type === "error") throw new Error(event.error);
              if (event.type === "complete") {
                finalResult = event.result;
                continue;
              }
              const nextPreviews = [...(currentArtifact.previewUrls ?? [])];
              if (event.type === "preview" && typeof event.index === "number") {
                nextPreviews[event.index] = event.previewUrl;
              }
              currentArtifact = {
                ...currentArtifact,
                slides: event.slides ?? currentArtifact.slides,
                generationStage: event.stage,
                generationStageIndex: event.stageIndex,
                generationProgress: event.progress,
                generationMessage: event.message,
                previewUrls: nextPreviews,
              };
              onPresent(currentArtifact);
              await paintProgressFrame();
            }
            if (done) break;
          }
          if (!finalResult) throw new Error("Presentation generation ended before completion.");
          const readyArtifact = {
            ...currentArtifact,
            slides: finalResult.slides ?? currentArtifact.slides,
            generationStatus: "ready",
            generationStage: "verify",
            generationStageIndex: 4,
            generationProgress: 1,
            generationMessage: "PowerPoint ready",
            previewUrls: finalResult.previewUrls,
            qualityIssues: finalResult.quality?.issues,
            narrativeQuality: finalResult.quality?.narrative,
            fileName: finalResult.fileName,
            downloadUrl: finalResult.downloadUrl,
          } as Artifact;
          onPresent(readyArtifact);
          return finalResult;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not create the PowerPoint file.";
          onPresent({
            ...currentArtifact,
            generationStatus: "error",
            generationError: message,
            generationMessage: "Generation stopped",
          } as Artifact);
          throw error;
        }
      },
    },
  });
  return null;
}

export const Assistant = ({ initialThreadId }: { initialThreadId?: string }) => {
  const { settings, save, ready } = useProviderSettings();
  const { models, loading, error, refresh } = useRemoteModels(settings, ready);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [voiceAdapters, setVoiceAdapters] = useState<{
    speech?: SpeechSynthesisAdapter;
    dictation?: WebSpeechDictationAdapter;
  }>({});

  useEffect(() => {
    setVoiceAdapters({
      speech: "speechSynthesis" in window ? readAloudSpeechAdapter : undefined,
      dictation: WebSpeechDictationAdapter.isSupported()
        ? new WebSpeechDictationAdapter({ continuous: true, interimResults: true })
        : undefined,
    });
  }, []);

  useEffect(() => {
    setThreadId(new URL(window.location.href).searchParams.get("thread") ?? undefined);
    const handlePopState = () => {
      setThreadId(new URL(window.location.href).searchParams.get("thread") ?? undefined);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (models.length === 0) return;
    if (settings.model && models.some((model) => model.id === settings.model)) {
      return;
    }
    // Settings saved before the vendor-prefix fix may hold "owner/Model"
    // while the catalog now lists the bare id. Match on the stripped suffix.
    const bare = settings.model.includes("/")
      ? settings.model.slice(settings.model.lastIndexOf("/") + 1)
      : "";
    const byLabel =
      models.find((model) => model.label === settings.model) ??
      (bare ? models.find((model) => model.label === bare) : undefined);
    if (byLabel) {
      save({ ...settings, model: byLabel.id });
      return;
    }
    const next = models.find((model) => model.kind === "chat") ?? models[0];
    if (next) save({ ...settings, model: next.id });
  }, [models, save, settings.model, settings.provider, settings.baseURL, settings.apiKey]);

  // Gateway catalogs often list display-name ids ("GPT Image 1") that the
  // Images API rejects (400). Prefer known-good lowercase ids, then any
  // id without whitespace, before falling back to the default.
  const imageModel =
    ["gpt-image-2", "gpt-image-1.5", "grok-imagine-image-2.0", "grok-imagine-image"].find((id) =>
      models.some((model) => model.kind === "image" && model.id === id),
    ) ||
    models.find((model) => model.kind === "image" && !/\s/.test(model.id))?.id ||
    "gpt-image-2";
  const settingsRef = useRef(settings);
  const imageModelRef = useRef(imageModel);
  settingsRef.current = settings;
  imageModelRef.current = imageModel;

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        body: () => ({
          provider: settingsRef.current.provider,
          model: settingsRef.current.model,
          imageModel: imageModelRef.current,
          baseURL: settingsRef.current.baseURL,
          apiKey: settingsRef.current.apiKey,
          system: settingsRef.current.systemPrompt,
          callSettings: { temperature: settingsRef.current.temperature },
          capabilities: {
            webSearch: settingsRef.current.webSearch,
            codeExecution: settingsRef.current.codeExecution,
            imageGeneration: settingsRef.current.imageGeneration,
          },
        }),
      }),
    [],
  );

  const runtime = useRemoteThreadListRuntime({
    adapter: serverThreadListAdapter,
    threadId,
    onThreadIdChange: (nextThreadId) => {
      setThreadId(nextThreadId);
      const url = new URL(window.location.href);
      if (nextThreadId) {
        url.searchParams.set("thread", nextThreadId);
      } else {
        url.searchParams.delete("thread");
      }
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    },
    runtimeHook: () =>
      useChatRuntime({
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport,
        adapters: {
          attachments: attachmentAdapter,
          feedback: serverFeedbackAdapter,
          speech: voiceAdapters.speech,
          dictation: voiceAdapters.dictation,
        },
      }),
  });

  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: STARTERS,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <ShellProvider
        value={{
          modelId: settings.model,
          setModelId: (id) => save({ ...settings, model: id }),
          provider: settings.provider,
          reasoningEffort: settings.reasoningEffort,
          setReasoningEffort: (reasoningEffort) => save({ ...settings, reasoningEffort }),
          models,
          loading,
          error,
          refresh,
        }}
      >
        <ArtifactBridge onPresent={setArtifact} />
        <SidebarProvider>
          <div className="flex h-dvh w-full">
            <ThreadListSidebar settings={settings} models={models} onSaveSettings={save} />
            <SidebarInset>
              <ConversationHeader
                provider={settings.provider}
                searchOpen={searchOpen}
                onToggleSearch={() => setSearchOpen((value) => !value)}
              />
              {searchOpen && (
                <div className="border-b p-2">
                  <ConversationSearch onClose={() => setSearchOpen(false)} />
                </div>
              )}
              <div className="flex min-h-0 flex-1">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Thread components={AGENT_THREAD_COMPONENTS} />
                </div>
                {artifact ? (
                  <ArtifactCanvas artifact={artifact} onClose={() => setArtifact(null)} />
                ) : null}
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </ShellProvider>
    </AssistantRuntimeProvider>
  );
};
