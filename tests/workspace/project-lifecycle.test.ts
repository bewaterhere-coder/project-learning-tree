import { describe, expect, it } from "vitest";
import { createProject } from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applySelectedCommand,
  archiveProject,
  createWorkspace,
  createWorkspaceProject,
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
    expect(next.projects[0]?.snapshot.pass.rootNodeIds).toHaveLength(1);
    expect(next.projects[0]?.snapshot.pass.activeStack).toEqual([]);
    const rootId = next.projects[0]?.snapshot.pass.projectRootNodeId;
    expect(rootId).toBeDefined();
    expect(next.projects[0]?.bootstrap?.generatedQuestionCount).toBe(
      next.projects[0]?.snapshot.nodes[rootId!]?.childIds.length,
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
