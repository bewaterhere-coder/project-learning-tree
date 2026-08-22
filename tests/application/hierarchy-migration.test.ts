import { describe, expect, it } from "vitest";
import { migrateSnapshotHierarchy } from "../../src/application/index.js";
import {
  createProject,
  migratedProjectRootId,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type DomainSnapshot,
} from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

function rootedSnapshot(): DomainSnapshot {
  const ports = sequentialFixturePorts(7000);
  const created = createProject({ name: "Legacy Rooted", source: "legacy" }, ports);
  if (!created.ok) {
    throw new Error(created.error.kind);
  }
  const projectId = created.snapshot.project.id;
  const passId = created.snapshot.pass.id;
  const rootId = migratedProjectRootId(projectId);
  return {
    project: {
      id: projectId,
      name: "Legacy Rooted",
      source: "legacy",
      passIds: [passId],
    },
    pass: {
      id: passId,
      projectId,
      status: "in_progress",
      rootNodeIds: [rootId],
      projectRootNodeId: rootId,
      activeStack: [rootId, "legacy-q1"],
      currentFocusNodeId: rootId,
      frontier: [],
    },
    nodes: {
      [rootId]: {
        id: rootId,
        question: "Legacy Rooted",
        goal: PROJECT_ROOT_ORIENTATION_GOAL,
        lifecycle: "active",
        targetDepth: "L1",
        definitionOfDone: [],
        evidence: [],
        childIds: ["legacy-q1", "legacy-q2"],
        blockingChildIds: [],
        conversationThreadId: `${rootId}:thread`,
        reopenHistory: [],
      },
      "legacy-q1": {
        id: "legacy-q1",
        parentId: rootId,
        question: "Q1",
        goal: "Understand Q1",
        lifecycle: "active",
        targetDepth: "L1",
        definitionOfDone: [],
        evidence: [],
        childIds: [],
        blockingChildIds: [],
        conversationThreadId: "legacy-q1:thread",
        reopenHistory: [],
      },
      "legacy-q2": {
        id: "legacy-q2",
        parentId: rootId,
        question: "Q2",
        goal: "Understand Q2",
        lifecycle: "open",
        targetDepth: "L1",
        definitionOfDone: [],
        evidence: [],
        childIds: [],
        blockingChildIds: [],
        conversationThreadId: "legacy-q2:thread",
        reopenHistory: [],
      },
    },
  };
}

describe("migrateSnapshotHierarchy", () => {
  it("flattens Project Root children into top-level rootNodeIds", () => {
    const rooted = rootedSnapshot();
    const rootId = migratedProjectRootId(rooted.project.id);
    const first = migrateSnapshotHierarchy(rooted);

    expect(first.migrated).toBe(true);
    expect(first.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(first.snapshot.pass.rootNodeIds).toEqual(["legacy-q1", "legacy-q2"]);
    expect(first.snapshot.nodes[rootId]).toBeUndefined();
    expect(first.snapshot.nodes["legacy-q1"]?.parentId).toBeUndefined();
    expect(first.snapshot.nodes["legacy-q2"]?.parentId).toBeUndefined();
    expect(first.snapshot.pass.activeStack).toEqual(["legacy-q1"]);
    expect(first.snapshot.pass.currentFocusNodeId).toBe("legacy-q1");
  });

  it("is idempotent on a second migrate", () => {
    const rooted = rootedSnapshot();
    const first = migrateSnapshotHierarchy(rooted);
    const second = migrateSnapshotHierarchy(first.snapshot);

    expect(second.migrated).toBe(false);
    expect(second.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(second.snapshot.pass.rootNodeIds).toEqual(["legacy-q1", "legacy-q2"]);
  });

  it("no-ops when there are no roots and no Project Root pointer", () => {
    const ports = sequentialFixturePorts(7100);
    const created = createProject({ name: "Empty" }, ports);
    if (!created.ok) {
      throw new Error(created.error.kind);
    }
    const result = migrateSnapshotHierarchy(created.snapshot);
    expect(result.migrated).toBe(false);
    expect(result.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(result.snapshot.pass.rootNodeIds).toEqual([]);
  });
});
