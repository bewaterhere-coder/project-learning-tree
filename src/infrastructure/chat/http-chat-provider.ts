import type { ChatCompleteRequest, ChatProvider } from "../../ai/provider.js";
import type { ChatReply } from "../../ai/types.js";
import type { LearningContext } from "../../application/selectors/learning-context.js";
import type { NodeChatContext } from "../../application/selectors/node-chat-context.js";
import { parseNodeChatAiResponse } from "../llm/parse-response.js";

export interface HttpChatProviderOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
}

export function createHttpChatProvider(options: HttpChatProviderOptions): ChatProvider {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async complete(request: ChatCompleteRequest): Promise<ChatReply> {
      const nodeContext = toNodeChatContext(request.context);
      const history = request.context.conversation.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await fetchImpl(options.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: nodeContext,
          input: request.input,
          locale: request.locale ?? "en-US",
          history,
        }),
      });

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : `Chat API failed with status ${response.status}`;
        throw new Error(message);
      }

      const parsed = parseNodeChatAiResponse(payload);
      if (parsed === undefined) {
        throw new Error("Chat API returned an invalid response.");
      }

      return {
        answer: parsed.answer,
        suggestions: parsed.suggestions,
        proposals: [],
      };
    },
  };
}

export function toNodeChatContext(context: LearningContext): NodeChatContext {
  const nodeChatContext: NodeChatContext = {
    project: {
      id: context.project.id,
      name: context.project.name,
      source: context.project.source,
    },
  };

  if (context.node) {
    nodeChatContext.node = {
      id: context.node.id,
      question: context.node.question,
      goal: context.node.goal,
      lifecycle: context.node.lifecycle,
    };
    if (context.node.parentId && context.node.parentQuestion) {
      nodeChatContext.parentNode = {
        id: context.node.parentId,
        question: context.node.parentQuestion,
      };
    }
  }

  return nodeChatContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
