import { describe, expect, it } from "vitest";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applySelectedCommand,
  closeChat,
  followCurrentNode,
  hydrateWorkspacePreferences,
  initialFloatingChatPosition,
  moveFloatingChat,
  openChat,
  pinChatToNode,
  selectProject,
  selectedProject,
  setChatPlacement,
  serializeSemanticWorkspace,
  serializeWorkspacePreferences,
  createMemoryPreferenceStorage,
} from "../../src/workspace/index.js";

describe("workspace chat chrome", () => {
  it("opens and closes chat without changing Domain or focus", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focusBefore = selectedProject(workspace)?.snapshot.pass.currentFocusNodeId;
    const snapshotBefore = selectedProject(workspace)?.snapshot;
    const opened = openChat(workspace);
    expect(selectedProject(opened)?.layout.chatOpen).toBe(true);
    expect(selectedProject(opened)?.snapshot).toBe(snapshotBefore);
    expect(selectedProject(opened)?.snapshot.pass.currentFocusNodeId).toBe(focusBefore);
    const closed = closeChat(opened);
    expect(selectedProject(closed)?.layout.chatOpen).toBe(false);
    expect(selectedProject(closed)?.snapshot.pass.currentFocusNodeId).toBe(focusBefore);
  });

  it("keeps per-project pins when switching projects", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const pinnedA = pinChatToNode(workspace, projectA.ids.q1);
    expect(selectedProject(pinnedA)?.layout.chatBinding).toEqual({
      mode: "pinned",
      projectId: projectA.snapshot.project.id,
      nodeId: projectA.ids.q1,
    });
    const selectedB = selectProject(pinnedA, projectB.snapshot.project.id);
    expect(selectedProject(selectedB)?.layout.chatBinding.mode).toBe("follow-focus");
    const backA = selectProject(selectedB, projectA.snapshot.project.id);
    expect(selectedProject(backA)?.layout.chatBinding).toEqual({
      mode: "pinned",
      projectId: projectA.snapshot.project.id,
      nodeId: projectA.ids.q1,
    });
  });

  it("resets a pin only when the bound node is gone", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const pinned = pinChatToNode(workspace, projectA.ids.q1);
    const current = selectedProject(pinned);
    if (!current) {
      throw new Error("missing project");
    }
    const storage = createMemoryPreferenceStorage();
    storage.setItem(
      "plt.workspace.layout.v2",
      JSON.stringify({
        version: 2,
        shell: pinned.shell,
        projects: {
          [current.projectId]: {
            ...current.layout,
            chatBinding: {
              mode: "pinned",
              projectId: current.projectId,
              nodeId: "missing-node",
            },
          },
        },
      }),
    );
    const hydrated = hydrateWorkspacePreferences(pinned, storage);
    expect(selectedProject(hydrated)?.layout.chatBinding).toEqual({ mode: "follow-focus" });
  });

  it("remembers a user-moved floating position and does not change Domain when docking", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const opened = openChat(workspace);
    const snapshot = selectedProject(opened)?.snapshot;
    const moved = moveFloatingChat(opened, { x: 80, y: 40 });
    expect(selectedProject(moved)?.layout.chatPosition).toEqual({ x: 80, y: 40 });
    expect(selectedProject(moved)?.layout.chatPositionOrigin).toBe("user");
    const docked = setChatPlacement(moved, "docked");
    expect(selectedProject(docked)?.layout.chatPlacement).toBe("docked");
    expect(selectedProject(docked)?.snapshot).toBe(snapshot);
    expect(JSON.stringify(serializeSemanticWorkspace(docked))).not.toContain("chatPlacement");
    expect(JSON.stringify(serializeWorkspacePreferences(docked))).toContain("chatPlacement");
  });

  it("places the first floating chat near the bound node", () => {
    const position = initialFloatingChatPosition({ x: 100, y: 50 }, { x: 0, y: 0, zoom: 1 });
    expect(position.x).toBeGreaterThan(100);
    expect(position.y).toBe(62);
  });

  it("followCurrentNode clears pin without a Domain command", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const pinned = pinChatToNode(workspace, projectA.ids.q1);
    const followed = followCurrentNode(pinned);
    expect(selectedProject(followed)?.layout.chatBinding).toEqual({ mode: "follow-focus" });
    expect(selectedProject(followed)?.snapshot).toBe(selectedProject(pinned)?.snapshot);
  });

  it("focus command does not open chat", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const closed = closeChat(workspace);
    const focused = applySelectedCommand(closed, {
      type: "focusNode",
      nodeId: projectA.ids.q1,
    });
    expect(selectedProject(focused)?.layout.chatOpen).toBe(false);
  });
});
