import type { LlmProvider, NodeChatAiResponse, NodeChatRequest } from "./types.js";

export const MOCK_LLM_PROVIDER_ID = "mock" as const;

export interface MockLlmProviderOptions {
  reply?:
    | NodeChatAiResponse
    | ((request: NodeChatRequest) => NodeChatAiResponse | Promise<NodeChatAiResponse>);
  error?: Error;
  delayMs?: number;
}

/**
 * Deterministic in-process LLM provider for tests and local fallbacks.
 * Does not call the network. Trace support comes from `withLlmTrace`, not from
 * logic embedded here.
 */
export function createMockLlmProvider(
  options: MockLlmProviderOptions = {},
): LlmProvider {
  return {
    async complete(request: NodeChatRequest): Promise<NodeChatAiResponse> {
      if (options.delayMs && options.delayMs > 0) {
        await delay(options.delayMs);
      }
      if (options.error) {
        throw options.error;
      }
      if (typeof options.reply === "function") {
        return options.reply(request);
      }
      if (options.reply) {
        return options.reply;
      }
      return defaultMockReply(request);
    },
  };
}

function defaultMockReply(request: NodeChatRequest): NodeChatAiResponse {
  const question = request.context.node?.question ?? request.context.project.name;
  const zh = request.locale === "zh-CN";
  return {
    answer: zh
      ? `（mock）围绕「${question}」：${request.input}`
      : `(mock) For “${question}”: ${request.input}`,
    suggestions: [
      {
        type: "question",
        content: zh ? `关于「${question}」还缺什么？` : `What is still missing for “${question}”?`,
      },
    ],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
