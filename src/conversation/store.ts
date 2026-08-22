import type { PreferenceStorage } from "../workspace/index.js";
import { conversationKey, type ConversationIdentity } from "./identity.js";
import { emptyConversation } from "./session.js";
import type { ConversationRegistry, NodeConversation } from "./types.js";
import { CONVERSATION_STORE_KEY, CONVERSATION_STORE_VERSION } from "./types.js";

const FORBIDDEN_KEYS = [
  "snapshot",
  "activeStack",
  "currentFocusNodeId",
  "nodePositions",
  "inspectorOpen",
  "chatBinding",
  "chatOpen",
] as const;

export interface ConversationStore {
  load(identity: ConversationIdentity): Promise<NodeConversation | undefined>;
  save(conversation: NodeConversation): Promise<void>;
  loadRegistry(): Promise<ConversationRegistry>;
  saveRegistry(registry: ConversationRegistry): Promise<void>;
}

export function createMemoryConversationStore(
  initial: Record<string, string> = {},
  storage?: PreferenceStorage,
): ConversationStore & { storage: PreferenceStorage } {
  const backing: PreferenceStorage = storage ?? {
    getItem: (key) => initial[key] ?? null,
    setItem: (key, value) => {
      initial[key] = value;
    },
  };
  return {
    storage: backing,
    load: async (identity) => {
      const registry = readRegistry(backing);
      return registry.conversations[conversationKey(identity)];
    },
    save: async (conversation) => {
      const registry = readRegistry(backing);
      registry.conversations[conversationKey(conversation.identity)] = conversation;
      writeRegistry(backing, registry);
    },
    loadRegistry: async () => readRegistry(backing),
    saveRegistry: async (registry) => {
      if (Object.keys(registry.conversations).length === 0) {
        return;
      }
      writeRegistry(backing, registry);
    },
  };
}

export function parseConversationRegistry(
  value: unknown,
): ConversationRegistry | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of FORBIDDEN_KEYS) {
    if (key in value) {
      return undefined;
    }
  }
  if (value.version !== CONVERSATION_STORE_VERSION) {
    return undefined;
  }
  if (!isRecord(value.conversations)) {
    return undefined;
  }
  const conversations: Record<string, NodeConversation> = {};
  for (const [key, entry] of Object.entries(value.conversations)) {
    const parsed = parseConversation(entry);
    if (parsed === undefined) {
      return undefined;
    }
    conversations[key] = parsed;
  }
  return { conversations };
}

function readRegistry(storage: PreferenceStorage): ConversationRegistry {
  const raw = storage.getItem(CONVERSATION_STORE_KEY);
  if (raw === null || raw === "") {
    return { conversations: {} };
  }
  try {
    return parseConversationRegistry(JSON.parse(raw)) ?? { conversations: {} };
  } catch {
    return { conversations: {} };
  }
}

function writeRegistry(
  storage: PreferenceStorage,
  registry: ConversationRegistry,
): void {
  storage.setItem(
    CONVERSATION_STORE_KEY,
    JSON.stringify({
      version: CONVERSATION_STORE_VERSION,
      conversations: registry.conversations,
    }),
  );
}

function parseConversation(value: unknown): NodeConversation | undefined {
  if (!isRecord(value) || !isRecord(value.identity)) {
    return undefined;
  }
  const identity = parseIdentity(value.identity);
  if (identity === undefined || !Array.isArray(value.messages)) {
    return undefined;
  }
  return {
    identity,
    messages: value.messages.filter(isMessage),
    proposals: Array.isArray(value.proposals) ? (value.proposals as NodeConversation["proposals"]) : [],
    status:
      value.status === "thinking" || value.status === "error" ? value.status : "idle",
    error:
      isRecord(value.error) && typeof value.error.message === "string"
        ? { message: value.error.message }
        : undefined,
  };
}

function parseIdentity(value: Record<string, unknown>): ConversationIdentity | undefined {
  if (value.kind === "project" && typeof value.projectId === "string") {
    return { kind: "project", projectId: value.projectId };
  }
  if (
    value.kind === "node" &&
    typeof value.projectId === "string" &&
    typeof value.nodeId === "string"
  ) {
    return { kind: "node", projectId: value.projectId, nodeId: value.nodeId };
  }
  return undefined;
}

function isMessage(value: unknown): value is NodeConversation["messages"][number] {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getOrCreateConversation(
  registry: ConversationRegistry,
  identity: ConversationIdentity,
): NodeConversation {
  return registry.conversations[conversationKey(identity)] ?? emptyConversation(identity);
}
