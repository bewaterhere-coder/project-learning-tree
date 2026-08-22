import { describe, expect, it } from "vitest";
import {
  appendUserMessage,
  applyAssistantReply,
  conversationKey,
  emptyConversation,
  emptyRegistry,
  identitiesEqual,
  routeReplyToIdentity,
  upsertConversation,
} from "../../src/conversation/index.js";

describe("conversation identity and routing", () => {
  it("keeps node and project identities distinct", () => {
    const node = { kind: "node" as const, projectId: "p", nodeId: "n1" };
    const project = { kind: "project" as const, projectId: "p" };
    expect(conversationKey(node)).not.toBe(conversationKey(project));
    expect(identitiesEqual(node, project)).toBe(false);
  });

  it("routes an async reply to the original conversation only", () => {
    const q1 = { kind: "node" as const, projectId: "p", nodeId: "n1" };
    const q2 = { kind: "node" as const, projectId: "p", nodeId: "n2" };
    let registry = emptyRegistry();
    const started = appendUserMessage(emptyConversation(q1), "from q1", "req-1");
    registry = upsertConversation(registry, started);
    registry = upsertConversation(registry, emptyConversation(q2));
    registry = routeReplyToIdentity(registry, q1, "req-1", "answer for q1", []);
    expect(registry.conversations[conversationKey(q1)]?.messages.at(-1)?.content).toBe(
      "answer for q1",
    );
    expect(registry.conversations[conversationKey(q2)]?.messages ?? []).toEqual([]);
  });

  it("ignores replies that no longer match the pending request", () => {
    const identity = { kind: "node" as const, projectId: "p", nodeId: "n1" };
    const thinking = appendUserMessage(emptyConversation(identity), "hello", "req-1");
    expect(applyAssistantReply(thinking, "other", "stale", [])).toBeUndefined();
  });
});
