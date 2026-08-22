import { describe, expect, it } from "vitest";
import {
  CONVERSATION_STORE_KEY,
  createMemoryConversationStore,
  emptyConversation,
  parseConversationRegistry,
} from "../../src/conversation/index.js";
import {
  createMemoryPreferenceStorage,
  serializeSemanticWorkspace,
  serializeWorkspacePreferences,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";

describe("conversation persistence", () => {
  it("saves messages under plt.conversation.v1 only", async () => {
    const storage = createMemoryPreferenceStorage();
    const store = createMemoryConversationStore({}, storage);
    const identity = { kind: "node" as const, projectId: "p", nodeId: "n1" };
    const conversation = {
      ...emptyConversation(identity),
      messages: [
        {
          id: "m1",
          role: "user" as const,
          content: "hello",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    };
    await store.save(conversation);
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toContain("hello");
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toBeNull();
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBeNull();
  });

  it("rejects layout and domain keys in the conversation store", () => {
    expect(
      parseConversationRegistry({
        version: 1,
        conversations: {},
        chatOpen: true,
      }),
    ).toBeUndefined();
    expect(
      parseConversationRegistry({
        version: 1,
        snapshot: {},
        conversations: {},
      }),
    ).toBeUndefined();
  });

  it("does not leak conversation messages into layout or semantic payload", () => {
    const { workspace } = createDemoWorkspaceFixture();
    expect(JSON.stringify(serializeWorkspacePreferences(workspace))).not.toContain(
      '"messages"',
    );
    expect(JSON.stringify(serializeSemanticWorkspace(workspace))).not.toContain(
      '"role":"user"',
    );
  });
});
