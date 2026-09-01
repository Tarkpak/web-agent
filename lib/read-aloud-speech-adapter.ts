"use client";

import type { SpeechSynthesisAdapter } from "@assistant-ui/react";
import { useSyncExternalStore } from "react";

type ReadAloudState = {
  text: string;
  charIndex: number;
  startedAt: number | null;
  rate: number;
  playing: boolean;
};
let state: ReadAloudState = { text: "", charIndex: 0, startedAt: null, rate: 1, playing: false };
const listeners = new Set<() => void>();
const emit = (patch: Partial<ReadAloudState>) => {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
};

export function useReadAloudState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export function cycleReadAloudRate() {
  const rates = [1, 1.25, 1.5, 2];
  emit({ rate: rates[(rates.indexOf(state.rate) + 1) % rates.length] ?? 1 });
}

export const readAloudSpeechAdapter: SpeechSynthesisAdapter = {
  speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.rate;
    const subscribers = new Set<() => void>();
    const notify = () => {
      for (const subscriber of subscribers) subscriber();
    };
    const result: SpeechSynthesisAdapter.Utterance = {
      status: { type: "starting" },
      cancel: () => {
        speechSynthesis.cancel();
        result.status = { type: "ended", reason: "cancelled" };
        emit({ playing: false });
        notify();
      },
      subscribe: (subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      },
    };
    utterance.addEventListener("start", () => {
      result.status = { type: "running" };
      emit({ text, charIndex: 0, startedAt: Date.now(), playing: true });
      notify();
    });
    utterance.addEventListener("boundary", (event) => emit({ charIndex: event.charIndex }));
    utterance.addEventListener("end", () => {
      result.status = { type: "ended", reason: "finished" };
      emit({ charIndex: text.length, playing: false });
      notify();
    });
    utterance.addEventListener("error", (event) => {
      result.status = { type: "ended", reason: "error", error: event.error };
      emit({ playing: false });
      notify();
    });
    speechSynthesis.speak(utterance);
    return result;
  },
};
