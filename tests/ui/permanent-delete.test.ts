import { describe, expect, it, vi } from "vitest";
import {
  CONVERSATION_STORE_KEY,
  createMemoryConversationStore,
  emptyConversation,
} from "../../src/conversation/index.js";
import { permanentlyDeleteArchivedProject } from "../../src/ui/projects/permanent-delete.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  archiveProject,
  createMemoryPreferenceStorage,
  loadSemanticWorkspace,
  loadWorkspacePreferences,
  saveSemanticWorkspace,
  saveWorkspacePreferences,
  serializeWorkspacePreferences,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

describe("fail-closed permanent delete orchestration", () => {
  it("does not mutate semantic, conversations, or preferences for an active projectId", async () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    const conversationStore = createMemoryConversationStore({}, storage);
    await conversationStore.save({
      ...emptyConversation({
        kind: "node",
        projectId: projectA.snapshot.project.id,
        nodeId: projectA.ids.q1,
      }),
      messages: [
        {
          id: "m1",
          role: "user",
          content: "active conversation",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    });
    saveSemanticWorkspace(storage, workspace);
    saveWorkspacePreferences(storage, workspace);
    const semanticBefore = storage.getItem(WORKSPACE_SEMANTIC_KEY);
    const preferencesBefore = storage.getItem(WORKSPACE_PREFERENCES_KEY);
    const conversationsBefore = storage.getItem(CONVERSATION_STORE_KEY);

    const commit = vi.fn();
    const deleteForProject = vi.fn(conversationStore.deleteForProject.bind(conversationStore));
    const result = await permanentlyDeleteArchivedProject({
      workspace,
      projectId: projectA.snapshot.project.id,
      commit,
      conversationStore: { deleteForProject },
    });

    expect(result).toEqual({ deleted: false });
    expect(commit).not.toHaveBeenCalled();
    expect(deleteForProject).not.toHaveBeenCalled();
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBe(semanticBefore);
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toBe(preferencesBefore);
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toBe(conversationsBefore);
    expect(loadSemanticWorkspace(storage).projects).toHaveLength(2);
    expect(
      serializeWorkspacePreferences(workspace).projects[projectA.snapshot.project.id],
    ).toBeDefined();
    expect(
      (await conversationStore.loadRegistry()).conversations[
        `node:${projectA.snapshot.project.id}:${projectA.ids.q1}`
      ]?.messages[0]?.content,
    ).toBe("active conversation");
    expect(projectB.snapshot.project.id).toBeTruthy();
  });

  it("commits semantic deletion and prunes conversations only after deleted === true", async () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    const conversationStore = createMemoryConversationStore({}, storage);
    await conversationStore.save({
      ...emptyConversation({
        kind: "node",
        projectId: projectB.snapshot.project.id,
        nodeId: projectB.ids.alpha,
      }),
      messages: [
        {
          id: "m-b",
          role: "user",
          content: "archived conversation",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    });
    await conversationStore.save({
      ...emptyConversation({
        kind: "node",
        projectId: projectA.snapshot.project.id,
        nodeId: projectA.ids.q1,
      }),
      messages: [
        {
          id: "m-a",
          role: "user",
          content: "kept conversation",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    });

    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    saveSemanticWorkspace(storage, archived);
    saveWorkspacePreferences(storage, archived);

    const commit = vi.fn((next, semantic: boolean) => {
      expect(semantic).toBe(true);
      saveSemanticWorkspace(storage, next);
      saveWorkspacePreferences(storage, next);
    });

    const result = await permanentlyDeleteArchivedProject({
      workspace: archived,
      projectId: projectB.snapshot.project.id,
      commit,
      conversationStore,
    });

    expect(result).toEqual({
      deleted: true,
      projectId: projectB.snapshot.project.id,
    });
    expect(commit).toHaveBeenCalledTimes(1);
    const reloaded = loadSemanticWorkspace(storage);
    expect(reloaded.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
    ]);
    const preferences = loadWorkspacePreferences(storage);
    expect(preferences?.projects[projectB.snapshot.project.id]).toBeUndefined();
    expect(preferences?.projects[projectA.snapshot.project.id]).toBeDefined();
    const registry = await conversationStore.loadRegistry();
    expect(Object.keys(registry.conversations)).toEqual([
      `node:${projectA.snapshot.project.id}:${projectA.ids.q1}`,
    ]);
  });
});
