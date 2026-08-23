import type { ChatReply, ChatSuggestion, LearningProposal } from "./types.js";

const CHAT_SUGGESTION_JSON_EXAMPLE =
  '{"answer":"string","suggestions":[{"type":"question","content":"string"}]}';

export function chatSuggestionJsonExample(): string {
  return CHAT_SUGGESTION_JSON_EXAMPLE;
}

export function parseChatSuggestion(value: unknown): ChatSuggestion | undefined {
  if (!isRecord(value) || value.type !== "question" || typeof value.content !== "string") {
    return undefined;
  }
  const content = value.content.trim();
  if (content.length === 0) {
    return undefined;
  }
  return { type: "question", content };
}

export function parseChatSuggestions(value: unknown): ChatSuggestion[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const suggestions: ChatSuggestion[] = [];
  for (const entry of value) {
    const suggestion = parseChatSuggestion(entry);
    if (suggestion === undefined) {
      return undefined;
    }
    suggestions.push(suggestion);
  }
  return suggestions;
}

export function parseChatReply(value: unknown): ChatReply | undefined {
  if (!isRecord(value) || typeof value.answer !== "string") {
    return undefined;
  }
  const suggestions = parseChatSuggestions(value.suggestions) ?? [];
  if (!Array.isArray(value.proposals)) {
    return undefined;
  }
  const proposals: LearningProposal[] = [];
  for (const entry of value.proposals) {
    const proposal = parseProposal(entry);
    if (proposal === undefined) {
      return undefined;
    }
    proposals.push(proposal);
  }
  return { answer: value.answer, suggestions, proposals };
}

function parseProposal(value: unknown): LearningProposal | undefined {
  if (!isRecord(value) || typeof value.id !== "string") {
    return undefined;
  }
  const status =
    value.status === "accepted" || value.status === "ignored"
      ? value.status
      : "pending";
  if (value.type === "question" && typeof value.question === "string") {
    return {
      id: value.id,
      type: "question",
      sourceNodeId: String(value.sourceNodeId ?? ""),
      question: value.question,
      goal: typeof value.goal === "string" ? value.goal : "",
      suggestedDestination:
        value.suggestedDestination === "frontier" ? "frontier" : "blocking",
      rationale: typeof value.rationale === "string" ? value.rationale : undefined,
      status,
    };
  }
  if (
    value.type === "evidence" &&
    typeof value.reference === "string" &&
    typeof value.evidenceType === "string"
  ) {
    return {
      id: value.id,
      type: "evidence",
      sourceNodeId: String(value.sourceNodeId ?? ""),
      evidenceType: value.evidenceType,
      reference: value.reference,
      note: typeof value.note === "string" ? value.note : undefined,
      status,
    };
  }
  if (value.type === "criterion" && typeof value.description === "string") {
    return {
      id: value.id,
      type: "criterion",
      sourceNodeId: String(value.sourceNodeId ?? ""),
      description: value.description,
      required: value.required !== false,
      evidenceRequired: value.evidenceRequired === true,
      status,
    };
  }
  if (value.type === "summary" && typeof value.summary === "string") {
    return {
      id: value.id,
      type: "summary",
      sourceNodeId: String(value.sourceNodeId ?? ""),
      summary: value.summary,
      status,
    };
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
