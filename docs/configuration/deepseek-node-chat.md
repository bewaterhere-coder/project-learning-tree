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
| `VITE_CHAT_API_URL` | Yes for live chat in the browser | Browser-facing chat API URL. Use `/api/chat` with the Vite dev proxy. |
| `CHAT_API_PORT` | No | Port for the chat API server. Defaults to `8787`. |
| `CHAT_API_TARGET` | No | Vite proxy target for `/api/chat`. Defaults to `http://127.0.0.1:8787`. |

Copy `.env.example` to `.env` and fill in your API key:

```bash
cp .env.example .env
```

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
  "suggestions": ["…"]
}
```

The UI renders the answer in the message list and suggestions below the conversation.

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
4. Confirm the assistant answer and suggestion list appear.

Without an API key, the chat API returns `503` and the UI shows the existing provider error message.
