import type {
  NodeChatContext,
  NodeChatHistoryMessage,
} from "../../application/selectors/node-chat-context.js";
import type { ChatSuggestion } from "../../ai/types.js";
import type { GenerationLocale } from "../../framework/locale.js";

export interface NodeChatRequest {
  context: NodeChatContext;
  input: string;
  locale?: GenerationLocale;
  history?: NodeChatHistoryMessage[];
}

export interface NodeChatAiResponse {
  answer: string;
  suggestions: ChatSuggestion[];
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

export type {
  NodeChatContext,
  NodeChatHistoryMessage,
  NodeChatNodeContext,
  NodeChatParentContext,
  NodeChatProjectContext,
} from "../../application/selectors/node-chat-context.js";
