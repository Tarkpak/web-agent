"use client";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { ProviderSettingsButton } from "@/components/provider-settings";
import { ShellProvider } from "@/components/shell-context";
import { Thread } from "@/components/thread";
import { ThreadListSidebar } from "@/components/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useProviderSettings } from "@/hooks/use-provider-settings";
import { useRemoteModels } from "@/hooks/use-remote-models";
import type { Artifact } from "@/lib/artifacts";
import { TaskFileAttachmentAdapter } from "@/lib/task-file-attachment-adapter";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  Suggestions,
  Tools,
  useAui,
  useAuiToolOverrides,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { serverThreadListAdapter } from "@/lib/server-thread-list-adapter";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
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
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <h1 className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-medium tracking-tight duration-200">
        What should we work on?
      </h1>
      <p className="text-muted-foreground fade-in animate-in mt-2 max-w-md text-sm duration-200">
        Attach a photo to read it, pick gpt-image-2 to generate or edit, or just chat.
      </p>
    </div>
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
        onPresent({
          kind: "presentation",
          title: args.title,
          subtitle: args.subtitle,
          theme: args.theme ?? "tech",
          design: args.design,
          brand: args.brand,
          slides: args.slides,
          generationStatus: "building",
          previewUrls: [],
        } as Artifact);
        const response = await fetch("/api/presentations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const result = await response.json();
        if (!response.ok) {
          onPresent({
            kind: "presentation",
            title: args.title,
            subtitle: args.subtitle,
            theme: args.theme ?? "tech",
            design: args.design,
            brand: args.brand,
            slides: args.slides,
            generationStatus: "error",
            generationError: result.error || "Could not create the PowerPoint file.",
            previewUrls: [],
          } as Artifact);
          throw new Error(result.error || "Could not create the PowerPoint file.");
        }
        onPresent({
          kind: "presentation",
          title: args.title,
          subtitle: args.subtitle,
          theme: args.theme ?? "tech",
          design: args.design,
          brand: args.brand,
          slides: result.slides ?? args.slides,
          generationStatus: "ready",
          previewUrls: result.previewUrls,
          qualityIssues: result.quality?.issues,
          narrativeQuality: result.quality?.narrative,
          fileName: result.fileName,
          downloadUrl: result.downloadUrl,
        } as Artifact);
        return result;
      },
    },
  });
  return null;
}

export const Assistant = () => {
  const { settings, save, ready } = useProviderSettings();
  const { models, loading, error, refresh } = useRemoteModels(settings, ready);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

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
        }),
      }),
    [],
  );

  const runtime = useRemoteThreadListRuntime({
    adapter: serverThreadListAdapter,
    runtimeHook: () =>
      useChatRuntime({
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport,
        adapters: { attachments: attachmentAdapter },
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
          models,
          loading,
          error,
          refresh,
        }}
      >
        <ArtifactBridge onPresent={setArtifact} />
        <SidebarProvider>
          <div className="flex h-dvh w-full">
            <ThreadListSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">Agent Shell</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {settings.provider === "xai" ? "xAI Grok" : "OpenAI compatible"}
                      {error ? " · models unavailable" : ""}
                    </p>
                  </div>
                  <ProviderSettingsButton settings={settings} onSave={save} />
                </div>
              </header>
              <div className="flex min-h-0 flex-1">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Thread components={{ Welcome: AgentWelcome }} />
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
