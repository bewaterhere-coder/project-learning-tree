import type { PreferenceStorage } from "../../workspace/index.js";
import type { LLMInteractionTrace, LlmTraceRegistry } from "./types.js";
import {
  LLM_TRACE_MAX_ENTRIES,
  LLM_TRACE_STORE_KEY,
  LLM_TRACE_STORE_VERSION,
} from "./types.js";

const FORBIDDEN_KEYS = [
  "snapshot",
  "activeStack",
  "currentFocusNodeId",
  "nodePositions",
  "inspectorOpen",
  "chatBinding",
  "chatOpen",
  "conversations",
  "messages",
] as const;

export interface LlmTraceStore {
  load(): Promise<LlmTraceRegistry>;
  append(trace: LLMInteractionTrace): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryLlmTraceStore(
  initial: Record<string, string> = {},
  storage?: PreferenceStorage,
): LlmTraceStore & { storage: PreferenceStorage } {
  const backing: PreferenceStorage = storage ?? {
    getItem: (key) => initial[key] ?? null,
    setItem: (key, value) => {
      initial[key] = value;
    },
  };
  return {
    storage: backing,
    load: async () => readRegistry(backing),
    append: async (trace) => {
      const registry = readRegistry(backing);
      const traces = [...registry.traces, trace];
      const trimmed =
        traces.length > LLM_TRACE_MAX_ENTRIES
          ? traces.slice(traces.length - LLM_TRACE_MAX_ENTRIES)
          : traces;
      writeRegistry(backing, { traces: trimmed });
    },
    clear: async () => {
      writeRegistry(backing, { traces: [] });
    },
  };
}

export function parseLlmTraceRegistry(value: unknown): LlmTraceRegistry | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of FORBIDDEN_KEYS) {
    if (key in value) {
      return undefined;
    }
  }
  if (value.version !== LLM_TRACE_STORE_VERSION) {
    return undefined;
  }
  if (!Array.isArray(value.traces)) {
    return undefined;
  }
  const traces: LLMInteractionTrace[] = [];
  for (const entry of value.traces) {
    const parsed = parseTrace(entry);
    if (parsed === undefined) {
      return undefined;
    }
    traces.push(parsed);
  }
  return { traces };
}

function readRegistry(storage: PreferenceStorage): LlmTraceRegistry {
  const raw = storage.getItem(LLM_TRACE_STORE_KEY);
  if (raw === null || raw === "") {
    return { traces: [] };
  }
  try {
    return parseLlmTraceRegistry(JSON.parse(raw)) ?? { traces: [] };
  } catch {
    return { traces: [] };
  }
}

function writeRegistry(storage: PreferenceStorage, registry: LlmTraceRegistry): void {
  storage.setItem(
    LLM_TRACE_STORE_KEY,
    JSON.stringify({
      version: LLM_TRACE_STORE_VERSION,
      traces: registry.traces,
    }),
  );
}

function parseTrace(value: unknown): LLMInteractionTrace | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.completedAt !== "string" ||
    typeof value.durationMs !== "number" ||
    typeof value.provider !== "string" ||
    typeof value.input !== "string" ||
    (value.status !== "ok" && value.status !== "error") ||
    !isRecord(value.request)
  ) {
    return undefined;
  }

  const request = parseRequestSummary(value.request);
  if (request === undefined) {
    return undefined;
  }

  const trace: LLMInteractionTrace = {
    id: value.id,
    createdAt: value.createdAt,
    completedAt: value.completedAt,
    durationMs: value.durationMs,
    provider: value.provider,
    input: value.input,
    request,
    status: value.status,
  };

  if (typeof value.model === "string") {
    trace.model = value.model;
  }
  if (typeof value.locale === "string") {
    trace.locale = value.locale;
  }
  if (isRecord(value.response) && typeof value.response.answer === "string") {
    trace.response = {
      answer: value.response.answer,
      suggestionCount:
        typeof value.response.suggestionCount === "number"
          ? value.response.suggestionCount
          : 0,
    };
  }
  if (isRecord(value.error) && typeof value.error.message === "string") {
    trace.error = {
      message: value.error.message,
      status: typeof value.error.status === "number" ? value.error.status : undefined,
    };
  }

  return trace;
}

function parseRequestSummary(value: Record<string, unknown>): LLMInteractionTrace["request"] | undefined {
  if (typeof value.hasNode !== "boolean" || typeof value.hasParent !== "boolean") {
    return undefined;
  }
  if (typeof value.historyCount !== "number") {
    return undefined;
  }
  return {
    hasNode: value.hasNode,
    hasParent: value.hasParent,
    historyCount: value.historyCount,
    projectId: typeof value.projectId === "string" ? value.projectId : undefined,
    nodeId: typeof value.nodeId === "string" ? value.nodeId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
