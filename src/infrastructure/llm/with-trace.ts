import type { LlmTraceStore } from "../../ai/trace/index.js";
import type { LLMInteractionTrace } from "../../ai/trace/index.js";
import type { LlmProvider, NodeChatAiResponse, NodeChatRequest } from "./types.js";

export interface LlmTraceMiddlewareOptions {
  providerName: string;
  model?: string;
  store: LlmTraceStore;
  now?: () => Date;
  createId?: () => string;
}

/**
 * Provider-agnostic trace middleware. Wraps any `LlmProvider` without
 * embedding persistence or provider-specific logic inside implementations.
 */
export function withLlmTrace(
  provider: LlmProvider,
  options: LlmTraceMiddlewareOptions,
): LlmProvider {
  return {
    async complete(request: NodeChatRequest): Promise<NodeChatAiResponse> {
      const started = options.now?.() ?? new Date();
      const id = options.createId?.() ?? createTraceId();
      try {
        const response = await provider.complete(request);
        const completed = options.now?.() ?? new Date();
        await options.store.append(
          buildTrace({
            id,
            started,
            completed,
            request,
            options,
            status: "ok",
            response,
          }),
        );
        return response;
      } catch (error) {
        const completed = options.now?.() ?? new Date();
        await options.store.append(
          buildTrace({
            id,
            started,
            completed,
            request,
            options,
            status: "error",
            error,
          }),
        );
        throw error;
      }
    },
  };
}

function buildTrace(args: {
  id: string;
  started: Date;
  completed: Date;
  request: NodeChatRequest;
  options: LlmTraceMiddlewareOptions;
  status: "ok" | "error";
  response?: NodeChatAiResponse;
  error?: unknown;
}): LLMInteractionTrace {
  const { id, started, completed, request, options, status, response, error } = args;
  const trace: LLMInteractionTrace = {
    id,
    createdAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMs: Math.max(0, completed.getTime() - started.getTime()),
    provider: options.providerName,
    input: request.input,
    request: {
      hasNode: request.context.node !== undefined,
      hasParent: request.context.parentNode !== undefined,
      historyCount: request.history?.length ?? 0,
      projectId: request.context.project.id,
      nodeId: request.context.node?.id,
    },
    status,
  };

  if (options.model) {
    trace.model = options.model;
  }
  if (request.locale) {
    trace.locale = request.locale;
  }
  if (response) {
    trace.response = {
      answer: response.answer,
      suggestionCount: response.suggestions.length,
    };
  }
  if (status === "error") {
    trace.error = {
      message: error instanceof Error ? error.message : "Unknown LLM error",
      status:
        error instanceof Error &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined,
    };
  }

  return trace;
}

function createTraceId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `llm-trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
