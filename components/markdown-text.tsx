"use client";

import "streamdown/styles.css";

import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { memo } from "react";

const streamdownPlugins = { cjk, code };

function MarkdownTextImpl() {
  return (
    <StreamdownTextPrimitive
      className="aui-md"
      plugins={streamdownPlugins}
      shikiTheme={["github-light", "github-dark"]}
      animated
      smooth
      defer
      controls
      dir="auto"
    />
  );
}

export const MarkdownText = memo(MarkdownTextImpl);
