import { describe, expect, it } from "vitest";
import { migrateSnapshotHierarchy } from "../../src/application/index.js";
import {
  createProject,
  migratedProjectRootId,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type DomainSnapshot,
} from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

function flatSnapshot(): DomainSnapshot {
  const ports = sequentialFixturePorts(7000);
  const created = createProject({ name: "Flat Project", source: "legacy" }, ports);
  if (!created.ok) {
    throw new Error(created.error.kind);
  }
  const projectId = created.snapshot.project.id;
  const passId = created.snapshot.pass.id;
  return {
    project: {
      id: projectId,
      name: "Flat Project",
      source: "legacy",
      passIds: [passId],
    },
    pass: {
      id: passId,
      projectId,
      status: "in_progress",
      rootNodeIds: ["legacy-q1", "legacy-q2"],
      activeStack: ["legacy-q1"],
      currentFocusNodeId: "legacy-q1",
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

function rootedSnapshot(): DomainSnapshot {
  const ports = sequentialFixturePorts(7200);
  const created = createProject({ name: "Already Rooted", source: "ok" }, ports);
  if (!created.ok) {
    throw new Error(created.error.kind);
  }
  const projectId = created.snapshot.project.id;
  const passId = created.snapshot.pass.id;
  const rootId = migratedProjectRootId(projectId);
  return {
    project: {
      id: projectId,
      name: "Already Rooted",
      source: "ok",
      passIds: [passId],
    },
    pass: {
      id: passId,
      projectId,
      status: "in_progress",
      rootNodeIds: [rootId],
      projectRootNodeId: rootId,
      activeStack: ["legacy-q1"],
      currentFocusNodeId: "legacy-q1",
      frontier: [],
    },
    nodes: {
      [rootId]: {
        id: rootId,
        question: "Already Rooted",
        goal: PROJECT_ROOT_ORIENTATION_GOAL,
        lifecycle: "open",
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
  it("roots a flat snapshot under a stable Project Root id", () => {
    const flat = flatSnapshot();
    const rootId = migratedProjectRootId(flat.project.id);
    const first = migrateSnapshotHierarchy(flat);

    expect(first.migrated).toBe(true);
    expect(first.snapshot.pass.projectRootNodeId).toBe(rootId);
    expect(first.snapshot.pass.rootNodeIds).toEqual([rootId]);
    expect(first.snapshot.nodes[rootId]?.childIds).toEqual([
      "legacy-q1",
      "legacy-q2",
    ]);
    expect(first.snapshot.nodes["legacy-q1"]?.parentId).toBe(rootId);
    expect(first.snapshot.nodes["legacy-q2"]?.parentId).toBe(rootId);
    expect(first.snapshot.nodes["legacy-q1"]?.question).toBe("Q1");
    expect(first.snapshot.pass.activeStack).toEqual(["legacy-q1"]);
    expect(first.snapshot.pass.activeStack).not.toContain(rootId);
  });

  it("is idempotent on a second migrate of a rooted snapshot", () => {
    const flat = flatSnapshot();
    const first = migrateSnapshotHierarchy(flat);
    const second = migrateSnapshotHierarchy(first.snapshot);

    expect(second.migrated).toBe(false);
    expect(second.snapshot.pass.projectRootNodeId).toBe(
      first.snapshot.pass.projectRootNodeId,
    );
    expect(second.snapshot.pass.rootNodeIds).toEqual(
      first.snapshot.pass.rootNodeIds,
    );
  });

  it("scrubs Project Root from a legacy active stack without re-creating root", () => {
    const rooted = rootedSnapshot();
    const rootId = migratedProjectRootId(rooted.project.id);
    const polluted = {
      ...rooted,
      pass: {
        ...rooted.pass,
        activeStack: [rootId, "legacy-q1"],
        currentFocusNodeId: rootId,
      },
      nodes: {
        ...rooted.nodes,
        [rootId]: { ...rooted.nodes[rootId]!, lifecycle: "active" as const },
      },
    };
    const result = migrateSnapshotHierarchy(polluted);
    expect(result.migrated).toBe(true);
    expect(result.snapshot.pass.projectRootNodeId).toBe(rootId);
    expect(result.snapshot.pass.activeStack).not.toContain(rootId);
    expect(result.snapshot.nodes[rootId]?.lifecycle).toBe("open");
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

  it("preserves an already valid rooted snapshot", () => {
    const rooted = rootedSnapshot();
    const result = migrateSnapshotHierarchy(rooted);
    expect(result.migrated).toBe(false);
    expect(result.snapshot.pass.projectRootNodeId).toBe(
      migratedProjectRootId(rooted.project.id),
    );
  });
});
