# DeepSeek Node Context AI Chat

This guide explains how to run Node Chat against the real DeepSeek API.

## Architecture

```text
Node Chat UI
  → HTTP Chat Provider (browser)
  → Chat API server (Node)
  → DeepSeek provider (infrastructure)
  → DeepSeek API
```

Business code depends on the `ChatProvider` and `LlmProvider` interfaces. It does not import DeepSeek directly.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Yes for live chat | DeepSeek API key. Never commit this value. |
| `DEEPSEEK_MODEL` | No | DeepSeek model id. Defaults to `deepseek-reasoner`. |
| `DEEPSEEK_BASE_URL` | No | DeepSeek API base URL. Defaults to `https://api.deepseek.com`. |
| `VITE_CHAT_API_URL` | Yes for live chat in the browser | Browser-facing chat API URL. Use `/api/chat` with the Vite dev proxy. |
| `CHAT_API_PORT` | No | Port for the chat API server. Defaults to `8787`. |
| `CHAT_API_TARGET` | No | Vite proxy target for `/api/chat`. Defaults to `http://127.0.0.1:8787`. |

Copy `.env.example` to `.env` and fill in your API key:

```bash
cp .env.example .env
```

## Model configuration

Default model and base URL live in one place:

- `src/infrastructure/llm/config.ts`

```typescript
export const DEEPSEEK_DEFAULTS = {
  BASE_URL: "https://api.deepseek.com",
  MODEL: "deepseek-reasoner",
} as const;
```

Runtime resolution uses `resolveDeepSeekRuntimeConfig()`:

- `DEEPSEEK_MODEL` overrides the default model
- `DEEPSEEK_BASE_URL` overrides the default API base URL

This keeps model names out of provider, prompt, and UI code. Switching models later is an environment or config change, not a protocol change.

## Start locally

Install dependencies:

```bash
npm install
```

Run the chat API and Vite dev server together:

```bash
npm run dev:chat
```

Or run them in separate terminals:

```bash
DEEPSEEK_API_KEY=your_key npm run dev:api
VITE_CHAT_API_URL=/api/chat npm run dev
```

Open the app, click a node chat action, and send a message.

If `VITE_CHAT_API_URL` is unset, the UI falls back to the local stub provider.

## Node context scope

The current version injects only:

- project information
- current node
- parent node

It does not inject child nodes, RAG, memory, or knowledge-base content.

## Response format

The chat API returns structured JSON:

```json
{
  "answer": "…",
  "suggestions": [
    {
      "type": "question",
      "content": "…"
    }
  ]
}
```

`ChatReply.suggestions` uses the same shape so a later milestone can evolve:

```text
AI Reply → Question Proposal → Learning Node Evolution
```

The UI renders the answer in the message list and typed suggestions below the conversation.

## LLM Trace Viewer

Node Chat writes process-local traces through TASK-LLM-TRACE-001 (`plt.llm_trace.v1` in the Chat API process). Developers can inspect them without changing the write path:

1. Start `npm run dev:chat`.
2. Send a Node Chat message.
3. Open **Settings → LLM Traces**.

HTTP contracts (proxied by Vite as `/api/llm-traces`):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/llm-traces` | List summaries (`limit`, optional `status`, `projectId`) |
| `GET` | `/api/llm-traces/:id` | Full `LLMInteractionTrace` |
| `DELETE` | `/api/llm-traces` | Clear process-local traces |

Traces are lost when the Chat API process restarts. This is expected for the MVP.

## Test

Automated tests:

```bash
npm test
npm run typecheck
```

Manual smoke test:

1. Start `npm run dev:chat` with a valid `DEEPSEEK_API_KEY`.
2. Open a project and click a node chat action.
3. Send a question such as “What should I focus on next?”
4. Confirm the assistant answer and question suggestions appear.
5. Open Settings → LLM Traces and confirm the call appears; open detail for input/answer.

Without an API key, the chat API returns `503` and the UI shows the existing provider error message.
Without `VITE_CHAT_API_URL`, the Trace Viewer shows that the Chat API is not configured.
