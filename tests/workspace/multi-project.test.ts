import { describe, expect, it } from "vitest";
import {
  applyNodeDragStop,
  applySelectedCommand,
  createMemoryPreferenceStorage,
  createWorkspace,
  hydrateWorkspacePreferences,
  resolveNodePosition,
  saveWorkspacePreferences,
  selectProject,
  selectedProject,
  serializeWorkspacePreferences,
  setInspectorOpen,
  updateSelectedLayout,
  updateShell,
  WORKSPACE_PREFERENCES_KEY,
} from "../../src/workspace/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";

describe("multi-project workspace", () => {
  it("can exist with multiple projects", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    expect(workspace.projects).toHaveLength(2);
    expect(workspace.selectedProjectId).toBe(projectA.snapshot.project.id);
    expect(workspace.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
      projectB.snapshot.project.id,
    ]);
  });

  it("keeps Active Stack and Current Focus independent per project", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const a = selectedProject(workspace);
    const b = workspace.projects[1];
    if (!b) {
      throw new Error("missing project B");
    }

    expect(a.snapshot.pass.activeStack).toEqual([projectA.ids.q1]);
    expect(a.snapshot.pass.currentFocusNodeId).toBe(projectA.ids.q2);
    expect(b.snapshot.pass.activeStack).toEqual([projectB.ids.alpha]);
    expect(b.snapshot.pass.currentFocusNodeId).toBe(projectB.ids.alpha1);
  });

  it("switches selected project without mutating the other DomainSnapshot", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const snapshotA = workspace.projects[0]?.snapshot;
    const snapshotB = workspace.projects[1]?.snapshot;
    if (!snapshotA || !snapshotB) {
      throw new Error("missing snapshots");
    }

    const switched = selectProject(workspace, projectB.snapshot.project.id);
    expect(switched.selectedProjectId).toBe(projectB.snapshot.project.id);
    expect(switched.projects[0]?.snapshot).toBe(snapshotA);
    expect(switched.projects[1]?.snapshot).toBe(snapshotB);
    expect(switched.projects[0]?.snapshot.pass.activeStack).toEqual([
      projectA.ids.q1,
    ]);
    expect(switched.projects[0]?.snapshot.pass.currentFocusNodeId).toBe(
      projectA.ids.q2,
    );
  });

  it("applying a command to B leaves A's DomainSnapshot identity unchanged", () => {
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const snapshotA = workspace.projects[0]?.snapshot;
    if (!snapshotA) {
      throw new Error("missing snapshot A");
    }
    const onB = selectProject(workspace, projectB.snapshot.project.id);
    const focused = applySelectedCommand(onB, {
      type: "focusNode",
      nodeId: projectB.ids.beta,
    });
    expect(focused.projects[0]?.snapshot).toBe(snapshotA);
    expect(focused.projects[1]?.snapshot).not.toBe(
      onB.projects[1]?.snapshot,
    );
    expect(focused.projects[1]?.snapshot.pass.currentFocusNodeId).toBe(
      projectB.ids.beta,
    );
  });

  it("returns to a project with the original tree, stack, and focus", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const snapshotA = workspace.projects[0]?.snapshot;
    const back = selectProject(
      selectProject(workspace, projectB.snapshot.project.id),
      projectA.snapshot.project.id,
    );
    expect(back.projects[0]?.snapshot).toBe(snapshotA);
    expect(back.projects[0]?.snapshot.pass.activeStack).toEqual([
      projectA.ids.q1,
    ]);
    expect(back.projects[0]?.snapshot.pass.currentFocusNodeId).toBe(
      projectA.ids.q2,
    );
  });

  it("keeps sidebar resize and locale global across project switches", () => {
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const customized = updateShell(workspace, {
      projectSidebarWidth: 320,
      projectSidebarOpen: false,
      locale: "zh-CN",
    });
    const switched = selectProject(customized, projectB.snapshot.project.id);
    expect(switched.shell.projectSidebarWidth).toBe(320);
    expect(switched.shell.projectSidebarOpen).toBe(false);
    expect(switched.shell.locale).toBe("zh-CN");
  });

  it("remembers inspector state per project", () => {
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const closedA = setInspectorOpen(workspace, false);
    const onB = selectProject(closedA, projectB.snapshot.project.id);
    const resizedB = updateSelectedLayout(onB, { inspectorWidth: 480 });
    expect(resizedB.projects[0]?.layout.inspectorOpen).toBe(false);
    expect(resizedB.projects[1]?.layout.inspectorOpen).toBe(true);
    expect(resizedB.projects[1]?.layout.inspectorWidth).toBe(480);
    expect(resizedB.projects[0]?.layout.inspectorWidth).toBe(400);
  });

  it("closing inspector does not change Current Focus", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const closed = setInspectorOpen(workspace, false);
    expect(closed.projects[0]?.layout.inspectorOpen).toBe(false);
    expect(closed.projects[0]?.snapshot).toBe(workspace.projects[0]?.snapshot);
    expect(closed.projects[0]?.snapshot.pass.currentFocusNodeId).toBe(
      projectA.ids.q2,
    );
  });

  it("keeps workspace layout state separate from DomainSnapshot", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const moved = applyNodeDragStop(workspace, {
      [projectA.ids.q2]: { x: 120, y: 80 },
    });
    const payload = JSON.stringify(serializeWorkspacePreferences(moved));
    expect(payload).not.toContain("activeStack");
    expect(payload).not.toContain("currentFocusNodeId");
    expect(payload).not.toContain("\"snapshot\"");
    expect(payload).not.toContain("definitionOfDone");
    expect(moved.projects[0]?.snapshot).toBe(workspace.projects[0]?.snapshot);
  });
});

describe("node dragging layout", () => {
  it("updates nodePositions without changing DomainSnapshot reference or parent/child", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const snapshot = workspace.projects[0]?.snapshot;
    if (!snapshot) {
      throw new Error("missing snapshot");
    }
    const parentIdsBefore = snapshot.nodes[projectA.ids.q11]?.parentId;
    const childIdsBefore = snapshot.nodes[projectA.ids.q1]?.childIds;
    const next = applyNodeDragStop(workspace, {
      [projectA.ids.q11]: { x: 333, y: 444 },
    });
    expect(next.projects[0]?.snapshot).toBe(snapshot);
    expect(next.projects[0]?.snapshot.nodes[projectA.ids.q11]?.parentId).toBe(
      parentIdsBefore,
    );
    expect(next.projects[0]?.snapshot.nodes[projectA.ids.q1]?.childIds).toBe(
      childIdsBefore,
    );
    expect(next.projects[0]?.layout.nodePositions[projectA.ids.q11]).toEqual({
      x: 333,
      y: 444,
    });
  });

  it("does not let auto layout overwrite a saved user position", () => {
    const { projectA } = createDemoWorkspaceFixture();
    const auto = { [projectA.ids.q1]: { x: 0, y: 0 } };
    const saved = { [projectA.ids.q1]: { x: 900, y: 40 } };
    const resolved = resolveNodePosition(projectA.ids.q1, saved, auto);
    expect(resolved).toEqual({ x: 900, y: 40 });
    expect(auto[projectA.ids.q1]).not.toEqual(resolved);
  });

  it("restores positions after a project switch", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const moved = applyNodeDragStop(workspace, {
      [projectA.ids.q2]: { x: 15, y: 25 },
    });
    const switched = selectProject(moved, projectB.snapshot.project.id);
    const back = selectProject(switched, projectA.snapshot.project.id);
    expect(back.projects[0]?.layout.nodePositions[projectA.ids.q2]).toEqual({
      x: 15,
      y: 25,
    });
  });
});

describe("workspace preference persistence", () => {
  it("reloads saved positions and does not persist DomainSnapshot", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    const moved = applyNodeDragStop(workspace, {
      [projectA.ids.q1]: { x: 111, y: 222 },
    });
    saveWorkspacePreferences(storage, moved);
    const raw = storage.getItem(WORKSPACE_PREFERENCES_KEY) ?? "";
    expect(raw).not.toContain("activeStack");
    expect(raw).not.toContain("currentFocusNodeId");
    expect(raw).not.toContain("\"snapshot\"");
    expect(JSON.parse(raw).projects).toBeDefined();

    const fresh = createWorkspace([
      projectA.snapshot,
      createDemoWorkspaceFixture().projectB.snapshot,
    ]);
    const hydrated = hydrateWorkspacePreferences(fresh, storage);
    expect(
      hydrated.projects[0]?.layout.nodePositions[projectA.ids.q1],
    ).toEqual({ x: 111, y: 222 });
    expect(hydrated.projects[0]?.snapshot).toBe(fresh.projects[0]?.snapshot);
  });

  it("falls back to defaults when layout storage is corrupted", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_PREFERENCES_KEY]: "{not-json",
    });
    const hydrated = hydrateWorkspacePreferences(workspace, storage);
    expect(hydrated.shell).toEqual(workspace.shell);
    expect(hydrated.projects[0]?.layout.nodePositions).toEqual({});
  });

  it("falls back when stored layout looks like a DomainSnapshot", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_PREFERENCES_KEY]: JSON.stringify({
        version: 1,
        snapshot: { nodes: {} },
        activeStack: ["x"],
      }),
    });
    const hydrated = hydrateWorkspacePreferences(workspace, storage);
    expect(hydrated.shell.projectSidebarWidth).toBe(260);
    expect(hydrated.projects[0]?.layout.inspectorWidth).toBe(400);
  });
});
