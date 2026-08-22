import { describe, expect, it } from "vitest";
import {
  activateBlockingChild,
  activateNode,
  addCoreQuestion,
  closeNode,
  createBlockingChild,
  createProject,
  focusNode,
  reopenNode,
  setNodeSummary,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  createProjectWithRoots,
  expectError,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("activation and focus", () => {
  it("1. activates an eligible Open node and places it on the Active Stack", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const focusBefore = started.pass.currentFocusNodeId;
    const rootId = started.pass.rootNodeIds[0];
    if (!rootId) {
      throw new Error("missing root");
    }

    const snapshot = unwrap(activateNode(started, { nodeId: rootId }));

    expect(snapshot.nodes[rootId]?.lifecycle).toBe("active");
    expect(snapshot.pass.activeStack).toEqual([rootId]);
    expect(snapshot.pass.currentFocusNodeId).toBe(focusBefore);
    assertActiveBijection(snapshot);
  });

  it("2. focuses another node without mutating the Active Stack or lifecycle", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const otherId = active.pass.rootNodeIds[1];
    if (!otherId) {
      throw new Error("missing second root");
    }
    const stackBefore = [...active.pass.activeStack];
    const lifecyclesBefore = JSON.stringify(
      Object.values(active.nodes).map((node) => [node.id, node.lifecycle]),
    );

    const snapshot = unwrap(focusNode(active, { nodeId: otherId }));

    expect(snapshot.pass.currentFocusNodeId).toBe(otherId);
    expect(snapshot.pass.activeStack).toEqual(stackBefore);
    expect(snapshot.nodes[rootId]?.lifecycle).toBe("active");
    expect(snapshot.nodes[otherId]?.lifecycle).toBe("open");
    expect(
      JSON.stringify(
        Object.values(snapshot.nodes).map((node) => [node.id, node.lifecycle]),
      ),
    ).toBe(lifecyclesBefore);
    assertActiveBijection(snapshot);
  });

  it("3. rejects invalid Active Stack paths", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["Q2"]);
    const rootId = snapshot.pass.rootNodeIds[0];
    if (!rootId) {
      throw new Error("missing root");
    }
    snapshot = unwrap(activateNode(snapshot, { nodeId: rootId }));
    snapshot = unwrap(
      addCoreQuestion(snapshot, { question: "unused", goal: "unused" }, ports),
    );
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: rootId, summary: "done" }));
    snapshot = unwrap(closeNode(snapshot, { nodeId: rootId }));

    const childPorts = sequentialPorts();
    let tree = createProjectWithRoots(childPorts, ["Parent"]);
    const parentId = tree.pass.rootNodeIds[0];
    if (!parentId) {
      throw new Error("missing parent");
    }
    tree = unwrap(activateNode(tree, { nodeId: parentId }));
    tree = unwrap(
      createBlockingChild(
        tree,
        { parentId, question: "Child", goal: "Child" },
        childPorts,
      ),
    );
    const childId = tree.nodes[parentId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    tree = unwrap(
      activateBlockingChild(tree, { parentId, childId }),
    );
    tree = closePrepared(tree, childId, childPorts);
    tree = unwrap(setNodeSummary(tree, { nodeId: parentId, summary: "parent done" }));
    tree = unwrap(closeNode(tree, { nodeId: parentId }));
    tree = unwrap(reopenNode(tree, { nodeId: childId, reason: "revisit child" }, childPorts));

    const invalid = activateNode(tree, { nodeId: childId });
    expectError(invalid, "InvalidActiveStack");
  });

  it("focuses Closed and later Parked-capable Open nodes without activating them", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const first = snapshot.pass.rootNodeIds[0];
    const second = snapshot.pass.rootNodeIds[1];
    if (!first || !second) {
      throw new Error("missing roots");
    }
    snapshot = unwrap(activateNode(snapshot, { nodeId: first }));
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: first, summary: "done" }));
    snapshot = unwrap(closeNode(snapshot, { nodeId: first }));

    const focusedClosed = unwrap(focusNode(snapshot, { nodeId: first }));
    expect(focusedClosed.pass.currentFocusNodeId).toBe(first);
    expect(focusedClosed.nodes[first]?.lifecycle).toBe("closed");
    expect(focusedClosed.pass.activeStack).toEqual([]);
    expect(focusedClosed.nodes[second]?.lifecycle).toBe("open");

    const focusedAgain = unwrap(focusNode(focusedClosed, { nodeId: second }));
    expect(focusedAgain.nodes[second]?.lifecycle).toBe("open");
    expect(focusedAgain.pass.activeStack).toEqual([]);
    assertActiveBijection(focusedAgain);
  });

  it("does not change Current Focus when activating", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const first = snapshot.pass.rootNodeIds[0];
    const second = snapshot.pass.rootNodeIds[1];
    if (!first || !second) {
      throw new Error("missing roots");
    }
    snapshot = unwrap(focusNode(snapshot, { nodeId: second }));
    snapshot = unwrap(activateNode(snapshot, { nodeId: first }));
    expect(snapshot.pass.currentFocusNodeId).toBe(second);
    expect(snapshot.pass.activeStack).toEqual([first]);
  });

  it("keeps every Active Stack member active and every active node on the stack", () => {
    const ports = sequentialPorts();
    const { snapshot } = activateRoot(createProjectWithRoots(ports, ["Q1"]));
    assertActiveBijection(snapshot);
  });

  it("rejects createProject-less focus of an unknown node", () => {
    const ports = sequentialPorts();
    const snapshot = unwrap(createProject({ name: "Empty" }, ports));
    expectError(focusNode(snapshot, { nodeId: "missing" }), "NodeNotFound");
  });
});
