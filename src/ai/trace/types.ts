export type LlmTraceStatus = "ok" | "error";

export type LlmTraceProviderId = "deepseek" | "mock" | (string & {});

export interface LlmTraceRequestSummary {
  hasNode: boolean;
  hasParent: boolean;
  historyCount: number;
  projectId?: string;
  nodeId?: string;
}

export interface LlmTraceResponseSummary {
  answer: string;
  suggestionCount: number;
}

export interface LlmTraceError {
  message: string;
  status?: number;
}

/**
 * One recorded LLM provider interaction.
 * Separate from conversation messages; used for observability only.
 */
export interface LLMInteractionTrace {
  id: string;
  createdAt: string;
  completedAt: string;
  durationMs: number;
  provider: LlmTraceProviderId;
  model?: string;
  locale?: string;
  input: string;
  request: LlmTraceRequestSummary;
  response?: LlmTraceResponseSummary;
  error?: LlmTraceError;
  status: LlmTraceStatus;
}

export interface LlmTraceRegistry {
  traces: LLMInteractionTrace[];
}

export const LLM_TRACE_STORE_KEY = "plt.llm_trace.v1";
export const LLM_TRACE_STORE_VERSION = 1;

/** Soft cap to keep local-first storage bounded. */
export const LLM_TRACE_MAX_ENTRIES = 200;
