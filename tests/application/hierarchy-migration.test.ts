import { describe, expect, it } from "vitest";
import { migrateSnapshotHierarchy } from "../../src/application/index.js";
import {
  createProject,
  migratedProjectRootId,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type DomainSnapshot,
} from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

function legacyFlatSnapshot(): DomainSnapshot {
  const ports = sequentialFixturePorts(7000);
  const created = createProject({ name: "Legacy Flat", source: "legacy" }, ports);
  if (!created.ok) {
    throw new Error(created.error.kind);
  }
  const projectId = created.snapshot.project.id;
  const passId = created.snapshot.pass.id;
  return {
    project: {
      id: projectId,
      name: "Legacy Flat",
      source: "legacy",
      passIds: [passId],
    },
    pass: {
      id: passId,
      projectId,
      status: "in_progress",
      rootNodeIds: ["legacy-q1", "legacy-q2"],
      activeStack: ["legacy-q1"],
      frontier: [],
    },
    nodes: {
      "legacy-q1": {
        id: "legacy-q1",
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
  it("reparents flat roots under a stable Project Root id", () => {
    const legacy = legacyFlatSnapshot();
    const first = migrateSnapshotHierarchy(legacy);

    expect(first.migrated).toBe(true);
    const rootId = migratedProjectRootId(legacy.project.id);
    expect(first.snapshot.pass.projectRootNodeId).toBe(rootId);
    expect(first.snapshot.pass.rootNodeIds).toEqual([rootId]);
    expect(first.snapshot.nodes[rootId]?.question).toBe("Legacy Flat");
    expect(first.snapshot.nodes[rootId]?.goal).toBe(PROJECT_ROOT_ORIENTATION_GOAL);
    expect(first.snapshot.nodes[rootId]?.childIds).toEqual([
      "legacy-q1",
      "legacy-q2",
    ]);
    expect(first.snapshot.nodes["legacy-q1"]?.parentId).toBe(rootId);
    expect(first.snapshot.nodes["legacy-q2"]?.parentId).toBe(rootId);
    expect(first.snapshot.nodes["legacy-q1"]?.id).toBe("legacy-q1");
    expect(first.snapshot.pass.activeStack).toEqual(["legacy-q1"]);
  });

  it("is idempotent on a second migrate — same Root ID, no structural rewrite", () => {
    const legacy = legacyFlatSnapshot();
    const first = migrateSnapshotHierarchy(legacy);
    const second = migrateSnapshotHierarchy(first.snapshot);

    expect(second.migrated).toBe(false);
    expect(second.snapshot.pass.projectRootNodeId).toBe(
      first.snapshot.pass.projectRootNodeId,
    );
    expect(second.snapshot.pass.projectRootNodeId).toBe(
      migratedProjectRootId(legacy.project.id),
    );
    expect(second.snapshot.pass.rootNodeIds).toEqual(
      first.snapshot.pass.rootNodeIds,
    );
    expect(second.snapshot.nodes[second.snapshot.pass.projectRootNodeId!]?.childIds).toEqual(
      ["legacy-q1", "legacy-q2"],
    );
  });

  it("no-ops when there are no roots", () => {
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
