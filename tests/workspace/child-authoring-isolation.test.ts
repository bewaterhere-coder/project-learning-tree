import { describe, expect, it } from "vitest";
import {
  applySelectedCommand,
  createWorkspace,
  selectProject,
  serializeWorkspacePreferences,
} from "../../src/workspace/index.js";
import {
  createMixedChildrenFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";

describe("workspace authoring isolation", () => {
  it("creates and toggles children only on the selected project", () => {
    const ports = sequentialFixturePorts(4000);
    const mixed = createMixedChildrenFixture(ports);
    const { projectA } = createDemoWorkspaceFixture();
    const workspace = createWorkspace(
      [projectA.snapshot, mixed.snapshot],
      mixed.snapshot.project.id,
    );
    const snapshotA = workspace.projects[0]?.snapshot;
    if (!snapshotA) {
      throw new Error("missing project A");
    }

    const created = applySelectedCommand(
      workspace,
      {
        type: "createChild",
        parentId: mixed.ids.parent,
        question: "Only on B",
        goal: "Keep A untouched",
      },
      ports,
    );
    expect(created.projects[0]?.snapshot).toBe(snapshotA);
    expect(created.projects[1]?.snapshot).not.toBe(mixed.snapshot);
    expect(created.projects[1]?.snapshot.nodes[mixed.ids.parent]?.childIds).toHaveLength(
      3,
    );
    expect(snapshotA.nodes[projectA.ids.q1]?.childIds).toEqual(
      projectA.snapshot.nodes[projectA.ids.q1]?.childIds,
    );

    const marked = applySelectedCommand(created, {
      type: "markChildBlocking",
      parentId: mixed.ids.parent,
      childId: mixed.ids.ordinary,
    });
    expect(marked.projects[0]?.snapshot).toBe(snapshotA);
    expect(
      marked.projects[1]?.snapshot.nodes[mixed.ids.parent]?.blockingChildIds,
    ).toEqual([mixed.ids.blocking, mixed.ids.ordinary]);

    const unmarked = applySelectedCommand(marked, {
      type: "unmarkChildBlocking",
      parentId: mixed.ids.parent,
      childId: mixed.ids.ordinary,
    });
    expect(unmarked.projects[0]?.snapshot).toBe(snapshotA);
    expect(
      unmarked.projects[1]?.snapshot.nodes[mixed.ids.parent]?.blockingChildIds,
    ).toEqual([mixed.ids.blocking]);

    const switched = selectProject(unmarked, projectA.snapshot.project.id);
    expect(switched.projects[0]?.snapshot).toBe(snapshotA);
    expect(switched.projects[1]?.snapshot.nodes[mixed.ids.parent]?.childIds).toEqual(
      unmarked.projects[1]?.snapshot.nodes[mixed.ids.parent]?.childIds,
    );
  });

  it("does not serialize domain relationships or candidates into preferences", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const serialized = JSON.stringify(serializeWorkspacePreferences(workspace));
    expect(serialized).not.toContain("\"snapshot\"");
    expect(serialized).not.toContain("\"nodes\"");
    expect(serialized).not.toContain("childIds");
    expect(serialized).not.toContain("blockingChildIds");
    expect(serialized).not.toContain("candidate");
  });
});
