import { describe, expect, it } from "vitest";
import { createProject } from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applySelectedCommand,
  archiveProject,
  createWorkspace,
  createWorkspaceProject,
  deleteArchivedProject,
  restoreProject,
  selectedProject,
  selectProject,
} from "../../src/workspace/index.js";

describe("zero-active workspace", () => {
  it("allows createWorkspace([]) with a null selection", () => {
    const workspace = createWorkspace([]);
    expect(workspace.projects).toEqual([]);
    expect(workspace.selectedProjectId).toBeNull();
    expect(selectedProject(workspace)).toBeUndefined();
  });

  it("applySelectedCommand is a no-op without a selected project", () => {
    const workspace = createWorkspace([]);
    const next = applySelectedCommand(workspace, {
      type: "focusNode",
      nodeId: "missing",
    });
    expect(next).toBe(workspace);
  });
});

describe("create / archive / restore", () => {
  it("creates a project through Domain, selects it, and leaves it unarchived", async () => {
    const workspace = createWorkspace([]);
    const next = await createWorkspaceProject(
      workspace,
      { name: "  Agents  " },
      sequentialFixturePorts(500),
    );
    expect(next.projects).toHaveLength(1);
    expect(next.selectedProjectId).toBe(next.projects[0]?.projectId);
    expect(next.projects[0]?.archived).toBe(false);
    expect(next.projects[0]?.snapshot.project.name).toBe("Agents");
    expect(next.projects[0]?.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(next.projects[0]?.snapshot.pass.rootNodeIds.length).toBeGreaterThan(0);
    expect(next.projects[0]?.snapshot.pass.activeStack).toEqual([]);
    for (const rootId of next.projects[0]?.snapshot.pass.rootNodeIds ?? []) {
      expect(next.projects[0]?.snapshot.nodes[rootId]?.parentId).toBeUndefined();
    }
    expect(next.projects[0]?.bootstrap?.generatedQuestionCount).toBe(
      next.projects[0]?.snapshot.pass.rootNodeIds.length,
    );
  });

  it("archives a non-selected project without changing selection or snapshot identity", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const snapshotB = workspace.projects[1]?.snapshot;
    const next = archiveProject(workspace, projectB.snapshot.project.id);
    expect(next.selectedProjectId).toBe(projectA.snapshot.project.id);
    expect(next.projects[1]?.archived).toBe(true);
    expect(next.projects[1]?.snapshot).toBe(snapshotB);
    expect(next.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
      projectB.snapshot.project.id,
    ]);
  });

  it("archives the selected middle project and selects the next active", () => {
    const a = createProject({ name: "A" }, sequentialFixturePorts(1));
    const b = createProject({ name: "B" }, sequentialFixturePorts(10));
    const c = createProject({ name: "C" }, sequentialFixturePorts(20));
    if (!a.ok || !b.ok || !c.ok) {
      throw new Error("expected projects");
    }
    const workspace = selectProject(
      createWorkspace([a.snapshot, b.snapshot, c.snapshot]),
      b.snapshot.project.id,
    );
    const next = archiveProject(workspace, b.snapshot.project.id);
    expect(next.selectedProjectId).toBe(c.snapshot.project.id);
    expect(next.projects[1]?.archived).toBe(true);
    expect(next.projects[1]?.snapshot).toBe(workspace.projects[1]?.snapshot);
    expect(next.projects[1]?.layout).toEqual(workspace.projects[1]?.layout);
  });

  it("sets selection to null when the last active project is archived", () => {
    const created = createProject({ name: "Only" }, sequentialFixturePorts(30));
    if (!created.ok) {
      throw new Error("expected project");
    }
    const workspace = createWorkspace([created.snapshot]);
    const next = archiveProject(workspace, created.snapshot.project.id);
    expect(next.selectedProjectId).toBeNull();
    expect(next.projects[0]?.archived).toBe(true);
  });

  it("restore keeps current selection, or selects the project when none is selected", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    const restored = restoreProject(archived, projectB.snapshot.project.id);
    expect(restored.selectedProjectId).toBe(projectA.snapshot.project.id);
    expect(restored.projects[1]?.archived).toBe(false);

    const empty = archiveProject(
      archiveProject(workspace, projectA.snapshot.project.id),
      projectB.snapshot.project.id,
    );
    expect(empty.selectedProjectId).toBeNull();
    const revived = restoreProject(empty, projectB.snapshot.project.id);
    expect(revived.selectedProjectId).toBe(projectB.snapshot.project.id);
    expect(revived.projects[1]?.archived).toBe(false);
    expect(revived.projects[1]?.snapshot).toBe(workspace.projects[1]?.snapshot);
  });
});

describe("permanent delete archived project", () => {
  it("removes only the archived project and reports deleted: true", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    const snapshotA = archived.projects[0]?.snapshot;
    const result = deleteArchivedProject(archived, projectB.snapshot.project.id);
    expect(result.deleted).toBe(true);
    if (result.deleted !== true) {
      throw new Error("expected deletion");
    }
    expect(result.projectId).toBe(projectB.snapshot.project.id);
    expect(result.workspace.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
    ]);
    expect(result.workspace.projects[0]?.snapshot).toBe(snapshotA);
    expect(result.workspace.selectedProjectId).toBe(projectA.snapshot.project.id);
  });

  it("returns deleted: false for active or missing projects without mutating workspace", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const active = deleteArchivedProject(workspace, projectA.snapshot.project.id);
    expect(active).toEqual({ workspace, deleted: false });
    expect(active.workspace).toBe(workspace);

    const missing = deleteArchivedProject(workspace, "missing-project");
    expect(missing).toEqual({ workspace, deleted: false });
    expect(missing.workspace).toBe(workspace);
  });

  it("clears selection when the deleted project was selected, and empties the final project", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const bothArchived = archiveProject(
      archiveProject(workspace, projectA.snapshot.project.id),
      projectB.snapshot.project.id,
    );
    expect(bothArchived.selectedProjectId).toBeNull();
    const first = deleteArchivedProject(bothArchived, projectA.snapshot.project.id);
    expect(first.deleted).toBe(true);
    if (first.deleted !== true) {
      throw new Error("expected deletion");
    }
    expect(first.workspace.projects).toHaveLength(1);
    expect(first.workspace.selectedProjectId).toBeNull();

    const last = deleteArchivedProject(first.workspace, projectB.snapshot.project.id);
    expect(last.deleted).toBe(true);
    if (last.deleted !== true) {
      throw new Error("expected deletion");
    }
    expect(last.workspace.projects).toEqual([]);
    expect(last.workspace.selectedProjectId).toBeNull();
  });

  it("archive then restore preserves project identity and snapshot", () => {
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const snapshot = workspace.projects[1]?.snapshot;
    const layout = workspace.projects[1]?.layout;
    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    const restored = restoreProject(archived, projectB.snapshot.project.id);
    expect(restored.projects[1]?.projectId).toBe(projectB.snapshot.project.id);
    expect(restored.projects[1]?.snapshot).toBe(snapshot);
    expect(restored.projects[1]?.layout).toEqual(layout);
    expect(restored.projects[1]?.archived).toBe(false);
  });
});
