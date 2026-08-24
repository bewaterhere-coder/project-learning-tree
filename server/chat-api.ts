import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  createMemoryLlmTraceStore,
  type LLMInteractionTrace,
  type LlmTraceListQuery,
  type LlmTraceStore,
} from "../src/ai/trace/index.js";
import type { NodeLifecycle } from "../src/domain/index.js";
import {
  createDeepSeekProvider,
  resolveDeepSeekApiKey,
  resolveDeepSeekRuntimeConfig,
  withLlmTrace,
  type LlmProvider,
  type NodeChatHistoryMessage,
  type NodeChatRequest,
} from "../src/infrastructure/llm/index.js";

const DEFAULT_PORT = 8787;
const LLM_TRACES_PATH = "/api/llm-traces";
const INPUT_PREVIEW_MAX = 120;

export interface LlmTraceListItem {
  id: string;
  createdAt: string;
  durationMs: number;
  provider: string;
  model?: string;
  status: "ok" | "error";
  inputPreview: string;
  projectId?: string;
  nodeId?: string;
  suggestionCount?: number;
  errorMessage?: string;
}

export function createChatApiServer(options: {
  port?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  /** Optional override (e.g. mock). When set, skips DeepSeek configuration. */
  provider?: LlmProvider;
  providerName?: string;
  model?: string;
  traceStore?: LlmTraceStore;
} = {}) {
  const apiKey = options.apiKey ?? resolveDeepSeekApiKey();
  const runtime = resolveDeepSeekRuntimeConfig();
  const traceStore = options.traceStore ?? createMemoryLlmTraceStore();
  const providerName = options.providerName ?? (options.provider ? "custom" : "deepseek");
  const model = options.model ?? (options.provider ? undefined : runtime.model);

  const baseProvider: LlmProvider | undefined = options.provider
    ? options.provider
    : apiKey
      ? createDeepSeekProvider({ apiKey, fetchImpl: options.fetchImpl })
      : undefined;

  const provider = baseProvider
    ? withLlmTrace(baseProvider, {
        providerName,
        model,
        store: traceStore,
      })
    : undefined;

  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      writeJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, {
        ok: true,
        provider: provider ? providerName : "unconfigured",
      });
      return;
    }

    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === LLM_TRACES_PATH) {
      const parsed = parseTraceListQuery(url.searchParams);
      if (parsed === undefined) {
        writeJson(response, 400, { error: "Invalid llm trace list query." });
        return;
      }
      try {
        const result = await traceStore.list(parsed);
        writeJson(response, 200, {
          traces: result.traces.map(toListItem),
          total: result.total,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected llm trace list failure.";
        writeJson(response, 500, { error: message });
      }
      return;
    }

    if (request.method === "DELETE" && url.pathname === LLM_TRACES_PATH) {
      try {
        await traceStore.clear();
        writeJson(response, 204, {});
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected llm trace clear failure.";
        writeJson(response, 500, { error: message });
      }
      return;
    }

    const detailMatch = url.pathname.match(/^\/api\/llm-traces\/([^/]+)$/);
    if (request.method === "GET" && detailMatch) {
      const id = decodeURIComponent(detailMatch[1] ?? "");
      try {
        const trace = await traceStore.getById(id);
        if (trace === undefined) {
          writeJson(response, 404, { error: "Trace not found" });
          return;
        }
        writeJson(response, 200, trace);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected llm trace detail failure.";
        writeJson(response, 500, { error: message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      if (!provider) {
        writeJson(response, 503, {
          error: "DeepSeek API key is not configured. Set DEEPSEEK_API_KEY.",
        });
        return;
      }

      try {
        const body = await readJsonBody(request);
        const parsed = parseChatRequest(body);
        if (parsed === undefined) {
          writeJson(response, 400, { error: "Invalid chat request payload." });
          return;
        }
        const reply = await provider.complete(parsed);
        writeJson(response, 200, reply);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected chat API failure.";
        writeJson(response, 502, { error: message });
      }
      return;
    }

    writeJson(response, 404, { error: "Not found" });
  });

  server.listen(options.port ?? DEFAULT_PORT);
  return Object.assign(server, { traceStore });
}

export function toLlmTraceListItem(trace: LLMInteractionTrace): LlmTraceListItem {
  return toListItem(trace);
}

function toListItem(trace: LLMInteractionTrace): LlmTraceListItem {
  const item: LlmTraceListItem = {
    id: trace.id,
    createdAt: trace.createdAt,
    durationMs: trace.durationMs,
    provider: trace.provider,
    status: trace.status,
    inputPreview: truncatePreview(trace.input),
  };
  if (trace.model) {
    item.model = trace.model;
  }
  if (trace.request.projectId) {
    item.projectId = trace.request.projectId;
  }
  if (trace.request.nodeId) {
    item.nodeId = trace.request.nodeId;
  }
  if (trace.response) {
    item.suggestionCount = trace.response.suggestionCount;
  }
  if (trace.error) {
    item.errorMessage = trace.error.message;
  }
  return item;
}

function truncatePreview(input: string): string {
  if (input.length <= INPUT_PREVIEW_MAX) {
    return input;
  }
  return `${input.slice(0, INPUT_PREVIEW_MAX)}…`;
}

function parseTraceListQuery(params: URLSearchParams): LlmTraceListQuery | undefined {
  const query: LlmTraceListQuery = {};
  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    const limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1) {
      return undefined;
    }
    query.limit = limit;
  }
  const status = params.get("status");
  if (status !== null) {
    if (status !== "ok" && status !== "error") {
      return undefined;
    }
    query.status = status;
  }
  const projectId = params.get("projectId");
  if (projectId !== null) {
    if (projectId === "") {
      return undefined;
    }
    query.projectId = projectId;
  }
  return query;
}

function parseChatRequest(value: unknown): NodeChatRequest | undefined {
  if (!isRecord(value) || typeof value.input !== "string" || !isRecord(value.context)) {
    return undefined;
  }
  const context = value.context;
  if (!isRecord(context.project)) {
    return undefined;
  }
  const project = context.project;
  if (typeof project.id !== "string" || typeof project.name !== "string") {
    return undefined;
  }

  const request: NodeChatRequest = {
    context: {
      project: {
        id: project.id,
        name: project.name,
        source: typeof project.source === "string" ? project.source : undefined,
      },
    },
    input: value.input,
    locale: value.locale === "zh-CN" ? "zh-CN" : "en-US",
  };

  if (isRecord(context.node)) {
    const node = context.node;
    if (
      typeof node.id === "string" &&
      typeof node.question === "string" &&
      typeof node.goal === "string" &&
      typeof node.lifecycle === "string"
    ) {
      request.context.node = {
        id: node.id,
        question: node.question,
        goal: node.goal,
        lifecycle: node.lifecycle as NodeLifecycle,
      };
    }
  }

  if (isRecord(context.parentNode)) {
    const parent = context.parentNode;
    if (typeof parent.id === "string" && typeof parent.question === "string") {
      request.context.parentNode = {
        id: parent.id,
        question: parent.question,
      };
    }
  }

  if (Array.isArray(value.history)) {
    const history: NodeChatHistoryMessage[] = [];
    for (const entry of value.history) {
      if (!isRecord(entry) || typeof entry.content !== "string") {
        continue;
      }
      if (entry.role === "user" || entry.role === "assistant") {
        history.push({ role: entry.role, content: entry.content });
      }
    }
    request.history = history;
  }

  return request;
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw === "" ? {} : JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  if (status === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
