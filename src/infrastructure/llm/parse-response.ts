import type { NodeChatAiResponse } from "./types.js";

export function parseNodeChatAiResponse(value: unknown): NodeChatAiResponse | undefined {
  if (!isRecord(value) || typeof value.answer !== "string") {
    return undefined;
  }
  if (!Array.isArray(value.suggestions)) {
    return undefined;
  }
  const suggestions = value.suggestions.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
  return {
    answer: value.answer.trim(),
    suggestions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
