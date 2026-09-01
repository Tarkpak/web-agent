"use client";

import type { FeedbackAdapter } from "@assistant-ui/react";

export const serverFeedbackAdapter: FeedbackAdapter = {
  submit: ({ message, type }) => {
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: message.id, type }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error(`Failed to submit feedback (${response.status})`);
    });
  },
};
