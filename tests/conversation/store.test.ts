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

  it("deleteForProject removes only that project's conversations and persists empty registries", async () => {
    const storage = createMemoryPreferenceStorage();
    const store = createMemoryConversationStore({}, storage);
    const keep = {
      ...emptyConversation({ kind: "node", projectId: "keep", nodeId: "n1" }),
      messages: [
        {
          id: "m-keep",
          role: "user" as const,
          content: "keep me",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    };
    const dropNode = {
      ...emptyConversation({ kind: "node", projectId: "drop", nodeId: "n1" }),
      messages: [
        {
          id: "m-drop",
          role: "user" as const,
          content: "drop me",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    };
    const dropProject = {
      ...emptyConversation({ kind: "project", projectId: "drop" }),
      messages: [
        {
          id: "m-drop-project",
          role: "assistant" as const,
          content: "project chat",
          createdAt: "2026-08-22T00:00:01.000Z",
        },
      ],
    };
    await store.save(keep);
    await store.save(dropNode);
    await store.save(dropProject);
    await store.deleteForProject("drop");
    const registry = await store.loadRegistry();
    expect(Object.keys(registry.conversations)).toEqual(["node:keep:n1"]);
    expect(registry.conversations["node:keep:n1"]?.messages[0]?.content).toBe("keep me");
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toContain("keep me");
    expect(storage.getItem(CONVERSATION_STORE_KEY)).not.toContain("drop me");

    await store.deleteForProject("keep");
    const empty = await store.loadRegistry();
    expect(empty.conversations).toEqual({});
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toBe(
      JSON.stringify({ version: 1, conversations: {} }),
    );
  });
});
