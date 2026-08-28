"use client";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import { ProviderSettingsButton } from "@/components/provider-settings";
import { ShellProvider } from "@/components/shell-context";
import { Thread } from "@/components/thread";
import { ThreadListSidebar } from "@/components/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useProviderSettings } from "@/hooks/use-provider-settings";
import { useRemoteModels } from "@/hooks/use-remote-models";
import type { Artifact } from "@/lib/artifacts";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  Suggestions,
  Tools,
  useAui,
  useAuiToolOverrides,
} from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import toolkit from "./toolkit";

const attachmentAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

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

function ArtifactBridge({
  onPresent,
}: {
  onPresent: (artifact: Artifact) => void;
}) {
  useAuiToolOverrides({
    present_artifact: {
      execute: async (args) => {
        onPresent(args as Artifact);
        return { shown: true };
      },
    },
  });
  return null;
}

export const Assistant = () => {
  const { settings, save, hints } = useProviderSettings();
  const { models, loading, error, refresh } = useRemoteModels(settings);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    if (models.length === 0) return;
    if (settings.model && models.some((model) => model.id === settings.model)) {
      return;
    }
    const byLabel = models.find((model) => model.label === settings.model);
    if (byLabel) {
      save({ ...settings, model: byLabel.id });
      return;
    }
    const next = models.find((model) => model.kind === "chat") ?? models[0];
    if (next) save({ ...settings, model: next.id });
  }, [models, save, settings.model, settings.provider, settings.baseURL, settings.apiKey]);

  const imageModel =
    models.find((model) => model.kind === "image")?.id || "gpt-image-2";
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

  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport,
    adapters: { attachments: attachmentAdapter },
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
                    {settings.provider === "xai"
                      ? "xAI Grok"
                      : "OpenAI compatible"}
                    {error ? " · models unavailable" : ""}
                  </p>
                </div>
                <ProviderSettingsButton
                  settings={settings}
                  hints={hints}
                  onSave={save}
                />
              </div>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 overflow-hidden">
                <Thread components={{ Welcome: AgentWelcome }} />
              </div>
              {artifact ? (
                <ArtifactCanvas
                  artifact={artifact}
                  onClose={() => setArtifact(null)}
                />
              ) : null}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      </ShellProvider>
    </AssistantRuntimeProvider>
  );
};
