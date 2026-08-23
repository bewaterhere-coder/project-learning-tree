import type { LearningProposal } from "../ai/types.js";
import type { ConversationIdentity } from "./identity.js";

export type ConversationRole = "user" | "assistant";
export type ConversationStatus = "idle" | "thinking" | "error";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
}

export interface ConversationError {
  message: string;
}

export interface NodeConversation {
  identity: ConversationIdentity;
  messages: ConversationMessage[];
  proposals: LearningProposal[];
  suggestions: string[];
  status: ConversationStatus;
  error?: ConversationError;
  pendingRequestId?: string;
}

export interface ConversationRegistry {
  conversations: Record<string, NodeConversation>;
}

export const CONVERSATION_STORE_KEY = "plt.conversation.v1";
export const CONVERSATION_STORE_VERSION = 1;
