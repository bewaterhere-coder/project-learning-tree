import type { ChatSuggestion } from "../../ai/types.js";
import { parseChatSuggestions } from "../../ai/schema.js";

export interface NodeChatAiResponse {
  answer: string;
  suggestions: ChatSuggestion[];
}

export function parseNodeChatAiResponse(value: unknown): NodeChatAiResponse | undefined {
  if (!isRecord(value) || typeof value.answer !== "string") {
    return undefined;
  }
  const suggestions = parseChatSuggestions(value.suggestions);
  if (suggestions === undefined) {
    return undefined;
  }
  return {
    answer: value.answer.trim(),
    suggestions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
