import { describe, expect, it } from "vitest";
import {
  activateNode,
  closeNode,
  ensureProjectRoot,
  parkNode,
  updateProjectMetadata,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  requireProjectRootId,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("Project Root structural hierarchy (TASK-010)", () => {
  it("creates one Project Root with Questions as children", () => {
    const ports = sequentialPorts();
    const snapshot = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const rootId = requireProjectRootId(snapshot);
    const [q1, q2] = coreQuestionIds(snapshot);
    expect(snapshot.pass.rootNodeIds).toEqual([rootId]);
    expect(snapshot.nodes[rootId]?.childIds).toEqual([q1, q2]);
    expect(q1 && snapshot.nodes[q1]?.parentId).toBe(rootId);
    expect(q2 && snapshot.nodes[q2]?.parentId).toBe(rootId);
  });

  it("activates a Core Question onto [Q1] without Project Root on the stack", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const rootId = requireProjectRootId(started);
    const [q1, q2] = coreQuestionIds(started);
    if (!q1 || !q2) {
      throw new Error("missing core questions");
    }

    const snapshot = unwrap(activateNode(started, { nodeId: q1 }));

    expect(snapshot.pass.projectRootNodeId).toBe(rootId);
    expect(snapshot.pass.activeStack).toEqual([q1]);
    expect(snapshot.pass.activeStack).not.toContain(rootId);
    expect(snapshot.nodes[q1]?.lifecycle).toBe("active");
    expect(snapshot.nodes[q2]?.lifecycle).toBe("open");
    expect(snapshot.nodes[rootId]?.lifecycle).toBe("open");
    assertActiveBijection(snapshot);
  });

  it("rejects activate / close / park on Project Root", () => {
    const ports = sequentialPorts();
    const snapshot = createProjectWithRoots(ports, ["Q1"]);
    const rootId = requireProjectRootId(snapshot);

    expectError(activateNode(snapshot, { nodeId: rootId }), "NotALearningQuestion");
    expectError(closeNode(snapshot, { nodeId: rootId }), "NotALearningQuestion");
    expectError(parkNode(snapshot, { nodeId: rootId }), "NotALearningQuestion");
  });

  it("switches Q1 → Q2 as sole active stack members", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const q2 = coreQuestionIds(onQ1)[1];
    if (!q2) {
      throw new Error("missing Q2");
    }

    const switched = unwrap(activateNode(onQ1, { nodeId: q2 }));

    expect(switched.pass.activeStack).toEqual([q2]);
    expect(switched.nodes[q1]?.lifecycle).toBe("open");
    expect(switched.nodes[q2]?.lifecycle).toBe("active");
    assertActiveBijection(switched);
  });

  it("parks Q1 clearing the active stack", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );

    const parkedQ1 = unwrap(parkNode(onQ1, { nodeId: q1 }));
    expect(parkedQ1.nodes[q1]?.lifecycle).toBe("parked");
    expect(parkedQ1.pass.activeStack).toEqual([]);
    assertActiveBijection(parkedQ1);
  });

  it("closes prepared Q1 and allows sibling Q2 to remain open", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const q2 = coreQuestionIds(onQ1)[1];
    if (!q2) {
      throw new Error("missing Q2");
    }

    const closed = closePrepared(onQ1, q1, ports);
    expect(closed.nodes[q1]?.lifecycle).toBe("closed");
    expect(closed.nodes[q2]?.lifecycle).toBe("open");
    expect(closed.pass.activeStack).toEqual([]);
    assertActiveBijection(closed);
  });

  it("syncs project name onto Project Root question label", () => {
    const ports = sequentialPorts();
    const snapshot = createProjectWithRoots(ports, ["Q1"]);
    const rootId = requireProjectRootId(snapshot);
    const updated = unwrap(
      updateProjectMetadata(snapshot, { name: "Renamed Project" }),
    );
    expect(updated.project.name).toBe("Renamed Project");
    expect(updated.nodes[rootId]?.question).toBe("Renamed Project");
    expect(updated.pass.projectRootNodeId).toBe(rootId);
  });

  it("ensureProjectRoot is idempotent", () => {
    const ports = sequentialPorts();
    const first = createProjectWithRoots(ports, ["Q1"]);
    const rootId = requireProjectRootId(first);
    const second = unwrap(ensureProjectRoot(first, ports));
    expect(second.pass.projectRootNodeId).toBe(rootId);
    expect(second.pass.rootNodeIds).toEqual([rootId]);
  });
});
