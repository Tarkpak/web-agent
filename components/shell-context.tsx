"use client";

import type { CatalogModel, ProviderKind, ReasoningEffort } from "@/lib/provider";
import { createContext, useContext } from "react";

export type ShellContextValue = {
  modelId: string;
  setModelId: (id: string) => void;
  provider: ProviderKind;
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  models: CatalogModel[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({
  value,
  children,
}: {
  value: ShellContextValue;
  children: React.ReactNode;
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) {
    throw new Error("useShell must be used inside ShellProvider");
  }
  return value;
}

export function useOptionalShell() {
  return useContext(ShellContext);
}
