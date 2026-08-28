# Agent Shell

A complete chat agent shell on [assistant-ui](https://www.assistant-ui.com/).

What is already wired:

- Multi-thread sidebar (new / search / archive / delete)
- Streaming chat with reasoning
- Provider settings on the page: OpenAI-compatible or native xAI
- Models loaded from `/v1/models` and picked in the composer
- Vision via image attachments; generate/edit via `gpt-image-2` and the Images API
- Local tools: current time, plan approval, canvas artifacts
- xAI extras when that supplier is selected: web search, X search, code execution
- Right-hand canvas for HTML / markdown / code

## Run

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL` / `OPENAI_MODEL`), or open Settings in the app and paste them there.
3. Install and start:

```bash
bun install
bun dev
```

Open http://localhost:3000.

## Layout

- `app/assistant.tsx` - app chrome, runtime, toolkit, canvas
- `app/toolkit.tsx` - tool schemas, executors, and cards
- `app/api/chat/route.ts` - Grok + xAI server tools
- `components/thread.tsx` - chat surface
- `components/threadlist-sidebar.tsx` - conversation list
- `components/artifact-canvas.tsx` - side canvas

The gear in the header opens provider settings. Keys typed there stay in this browser (`localStorage`). Leave the key blank to use `.env.local`.

The UI source lives in this repo, so you can restyle every pixel without forking the library.
