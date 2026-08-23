import type { LearningProposal } from "../ai/types.js";
import { conversationKey, type ConversationIdentity } from "./identity.js";
import type {
  ConversationMessage,
  ConversationRegistry,
  NodeConversation,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMessageId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyConversation(
  identity: ConversationIdentity,
): NodeConversation {
  return {
    identity,
    messages: [],
    proposals: [],
    suggestions: [],
    status: "idle",
  };
}

export function emptyRegistry(): ConversationRegistry {
  return { conversations: {} };
}

export function getConversation(
  registry: ConversationRegistry,
  identity: ConversationIdentity,
): NodeConversation {
  const key = conversationKey(identity);
  return registry.conversations[key] ?? emptyConversation(identity);
}

export function upsertConversation(
  registry: ConversationRegistry,
  conversation: NodeConversation,
): ConversationRegistry {
  return {
    conversations: {
      ...registry.conversations,
      [conversationKey(conversation.identity)]: conversation,
    },
  };
}

export function appendUserMessage(
  conversation: NodeConversation,
  content: string,
  requestId: string,
  createdAt = nowIso(),
): NodeConversation {
  const message: ConversationMessage = {
    id: createMessageId(),
    role: "user",
    content,
    createdAt,
  };
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    status: "thinking",
    error: undefined,
    pendingRequestId: requestId,
  };
}

export function applyAssistantReply(
  conversation: NodeConversation,
  requestId: string,
  answer: string,
  proposals: LearningProposal[],
  suggestions: string[] = [],
  createdAt = nowIso(),
): NodeConversation | undefined {
  if (conversation.pendingRequestId !== requestId) {
    return undefined;
  }
  const message: ConversationMessage = {
    id: createMessageId(),
    role: "assistant",
    content: answer,
    createdAt,
  };
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    proposals: [
      ...conversation.proposals,
      ...proposals.map((proposal) => ({ ...proposal })),
    ],
    suggestions: [...conversation.suggestions, ...suggestions],
    status: "idle",
    error: undefined,
    pendingRequestId: undefined,
  };
}

export function applyConversationError(
  conversation: NodeConversation,
  requestId: string,
  message: string,
): NodeConversation | undefined {
  if (conversation.pendingRequestId !== requestId) {
    return undefined;
  }
  return {
    ...conversation,
    status: "error",
    error: { message },
    pendingRequestId: undefined,
  };
}

export function updateProposal(
  conversation: NodeConversation,
  proposalId: string,
  patch: Partial<LearningProposal>,
): NodeConversation {
  return {
    ...conversation,
    proposals: conversation.proposals.map((proposal) =>
      proposal.id === proposalId ? ({ ...proposal, ...patch } as LearningProposal) : proposal,
    ),
  };
}

export function routeReplyToIdentity(
  registry: ConversationRegistry,
  identity: ConversationIdentity,
  requestId: string,
  answer: string,
  proposals: LearningProposal[],
  suggestions: string[] = [],
): ConversationRegistry {
  const current = getConversation(registry, identity);
  const next = applyAssistantReply(current, requestId, answer, proposals, suggestions);
  if (next === undefined) {
    return registry;
  }
  return upsertConversation(registry, next);
}
