import type { LLMInteractionTrace } from "../../ai/trace/index.js";

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

export interface LlmTraceListResponse {
  traces: LlmTraceListItem[];
  total: number;
}

export interface LlmTraceListClientQuery {
  limit?: number;
  status?: "ok" | "error";
  projectId?: string;
}

export interface LlmTraceApiClient {
  listTraces(query?: LlmTraceListClientQuery): Promise<LlmTraceListResponse>;
  getTrace(id: string): Promise<LLMInteractionTrace>;
  clearTraces(): Promise<void>;
}

export interface LlmTraceApiClientOptions {
  /** Base path or absolute URL ending at `/api/llm-traces`. */
  apiUrl?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_API_URL = "/api/llm-traces";

export function createLlmTraceApiClient(
  options: LlmTraceApiClientOptions = {},
): LlmTraceApiClient {
  const apiUrl = (options.apiUrl?.trim() || DEFAULT_API_URL).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async listTraces(query = {}) {
      const target = withQuery(apiUrl, query);
      const response = await fetchImpl(target, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(errorMessage(payload, `Trace list failed (${response.status})`));
      }
      const parsed = parseListResponse(payload);
      if (parsed === undefined) {
        throw new Error("Trace list returned an invalid response.");
      }
      return parsed;
    },

    async getTrace(id: string) {
      const response = await fetchImpl(`${apiUrl}/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(errorMessage(payload, `Trace detail failed (${response.status})`));
      }
      if (!isRecord(payload) || typeof payload.id !== "string") {
        throw new Error("Trace detail returned an invalid response.");
      }
      return payload as unknown as LLMInteractionTrace;
    },

    async clearTraces() {
      const response = await fetchImpl(apiUrl, { method: "DELETE" });
      if (response.status === 204) {
        return;
      }
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(errorMessage(payload, `Trace clear failed (${response.status})`));
      }
    },
  };
}

/** Resolve viewer API URL from the chat provider URL (`/api/chat` → `/api/llm-traces`). */
export function resolveLlmTraceApiUrl(chatApiUrl: string | undefined): string | undefined {
  const trimmed = chatApiUrl?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === "/api/chat" || trimmed.endsWith("/api/chat")) {
    return `${trimmed.slice(0, -"/api/chat".length)}/api/llm-traces` || "/api/llm-traces";
  }
  return "/api/llm-traces";
}

function withQuery(apiUrl: string, query: LlmTraceListClientQuery): string {
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.projectId) {
    params.set("projectId", query.projectId);
  }
  const qs = params.toString();
  return qs === "" ? apiUrl : `${apiUrl}?${qs}`;
}

function parseListResponse(value: unknown): LlmTraceListResponse | undefined {
  if (!isRecord(value) || !Array.isArray(value.traces) || typeof value.total !== "number") {
    return undefined;
  }
  const traces: LlmTraceListItem[] = [];
  for (const entry of value.traces) {
    const item = parseListItem(entry);
    if (item === undefined) {
      return undefined;
    }
    traces.push(item);
  }
  return { traces, total: value.total };
}

function parseListItem(value: unknown): LlmTraceListItem | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.durationMs !== "number" ||
    typeof value.provider !== "string" ||
    typeof value.inputPreview !== "string" ||
    (value.status !== "ok" && value.status !== "error")
  ) {
    return undefined;
  }
  const item: LlmTraceListItem = {
    id: value.id,
    createdAt: value.createdAt,
    durationMs: value.durationMs,
    provider: value.provider,
    status: value.status,
    inputPreview: value.inputPreview,
  };
  if (typeof value.model === "string") {
    item.model = value.model;
  }
  if (typeof value.projectId === "string") {
    item.projectId = value.projectId;
  }
  if (typeof value.nodeId === "string") {
    item.nodeId = value.nodeId;
  }
  if (typeof value.suggestionCount === "number") {
    item.suggestionCount = value.suggestionCount;
  }
  if (typeof value.errorMessage === "string") {
    item.errorMessage = value.errorMessage;
  }
  return item;
}

async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (raw === "") {
    return {};
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
