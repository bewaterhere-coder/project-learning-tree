import type {
  NodeChatContext,
  NodeChatHistoryMessage,
} from "../../application/selectors/node-chat-context.js";
import type { GenerationLocale } from "../../framework/locale.js";

export interface NodeChatRequest {
  context: NodeChatContext;
  input: string;
  locale?: GenerationLocale;
  history?: NodeChatHistoryMessage[];
}

export interface NodeChatAiResponse {
  answer: string;
  suggestions: string[];
}

export interface LlmProvider {
  complete(request: NodeChatRequest): Promise<NodeChatAiResponse>;
}

export interface LlmProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

export type {
  NodeChatContext,
  NodeChatHistoryMessage,
  NodeChatNodeContext,
  NodeChatParentContext,
  NodeChatProjectContext,
} from "../../application/selectors/node-chat-context.js";
