import { describe, expect, it } from "vitest";
import {
  activateNode,
  addCriterion,
  createBlockingChild,
  focusNode,
  isBlocked,
  moveCandidateToFrontier,
  parkNode,
  promoteFrontierItem,
  resumeNode,
  returnToParent,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  createActivatedChild,
  createProjectWithRoots,
  expectError,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("frontier and parking", () => {
  it("10-11. moves a non-blocking candidate to the pass-scoped Frontier without creating a node", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const nodeCount = Object.keys(active.nodes).length;

    const snapshot = unwrap(
      moveCandidateToFrontier(
        active,
        {
          sourceNodeId: rootId,
          question: "How does packaging work?",
          reason: "adjacent, not blocking",
        },
        ports,
      ),
    );
    const item = snapshot.pass.frontier[0];
    if (!item) {
      throw new Error("missing frontier item");
    }

    expect(snapshot.pass.frontier).toHaveLength(1);
    expect(item.sourceNodeId).toBe(rootId);
    expect(item.question).toBe("How does packaging work?");
    expect(item.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(Object.keys(snapshot.nodes)).toHaveLength(nodeCount);
    expect(Object.values(snapshot.nodes).some((node) => node.question === item.question)).toBe(false);
  });

  it("12. promotes a Frontier item only through an explicit command", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const withFrontier = unwrap(
      moveCandidateToFrontier(
        active,
        { sourceNodeId: rootId, question: "Later topic", reason: "postpone" },
        ports,
      ),
    );
    const itemId = withFrontier.pass.frontier[0]?.id;
    if (!itemId) {
      throw new Error("missing item");
    }

    const promoted = unwrap(
      promoteFrontierItem(
        withFrontier,
        { frontierItemId: itemId, placement: { kind: "root" } },
        ports,
      ),
    );
    const newRoot = promoted.pass.rootNodeIds.find((id) => id !== rootId);
    if (!newRoot) {
      throw new Error("missing promoted root");
    }
    expect(promoted.pass.frontier).toHaveLength(0);
    expect(promoted.nodes[newRoot]?.question).toBe("Later topic");
    expect(promoted.nodes[newRoot]?.lifecycle).toBe("open");
    expect(promoted.pass.activeStack).toEqual([rootId]);

    expectError(
      promoteFrontierItem(
        promoted,
        { frontierItemId: itemId, placement: { kind: "root" } },
        ports,
      ),
      "FrontierItemNotFound",
    );
  });

  it("promotes a Frontier item as a blocking child when placement is blockingChild", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const withFrontier = unwrap(
      moveCandidateToFrontier(
        active,
        { sourceNodeId: rootId, question: "Now blocking", reason: "reclassified" },
        ports,
      ),
    );
    const itemId = withFrontier.pass.frontier[0]?.id;
    if (!itemId) {
      throw new Error("missing item");
    }
    const promoted = unwrap(
      promoteFrontierItem(
        withFrontier,
        {
          frontierItemId: itemId,
          placement: { kind: "blockingChild", parentId: rootId },
        },
        ports,
      ),
    );
    const childId = promoted.nodes[rootId]?.childIds[0];
    expect(childId).toBeDefined();
    expect(promoted.nodes[rootId]?.blockingChildIds).toEqual([childId]);
    expect(isBlocked(promoted, rootId)).toBe(true);
  });

  it("promotes a Frontier item as an ordinary child without blocking the parent", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const withFrontier = unwrap(
      moveCandidateToFrontier(
        active,
        { sourceNodeId: rootId, question: "Side exploration", reason: "later" },
        ports,
      ),
    );
    const itemId = withFrontier.pass.frontier[0]?.id;
    if (!itemId) {
      throw new Error("missing item");
    }
    const promoted = unwrap(
      promoteFrontierItem(
        withFrontier,
        {
          frontierItemId: itemId,
          placement: { kind: "child", parentId: rootId },
        },
        ports,
      ),
    );
    const childId = promoted.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    expect(promoted.nodes[childId]?.parentId).toBe(rootId);
    expect(promoted.nodes[rootId]?.blockingChildIds).toEqual([]);
    expect(isBlocked(promoted, rootId)).toBe(false);
  });

  it("rejects promoting onto a closed parent for both child placements", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closed = closePrepared(active, rootId, ports);
    const withFrontier = unwrap(
      moveCandidateToFrontier(
        closed,
        { sourceNodeId: rootId, question: "Too late", reason: "closed" },
        ports,
      ),
    );
    const itemId = withFrontier.pass.frontier[0]?.id;
    if (!itemId) {
      throw new Error("missing item");
    }
    expectError(
      promoteFrontierItem(
        withFrontier,
        {
          frontierItemId: itemId,
          placement: { kind: "child", parentId: rootId },
        },
        ports,
      ),
      "InvalidLifecycleTransition",
    );
    expectError(
      promoteFrontierItem(
        withFrontier,
        {
          frontierItemId: itemId,
          placement: { kind: "blockingChild", parentId: rootId },
        },
        ports,
      ),
      "InvalidLifecycleTransition",
    );
  });

  it("13-14. parks the stack leaf and resumes it back onto the Active Stack", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    let snapshot = unwrap(
      addCriterion(
        active,
        {
          nodeId: rootId,
          description: "Keep this criterion",
          required: true,
          evidenceRequired: false,
        },
        ports,
      ),
    );
    const threadId = snapshot.nodes[rootId]?.conversationThreadId;
    const criterion = snapshot.nodes[rootId]?.definitionOfDone[0];
    snapshot = unwrap(
      createBlockingChild(
        snapshot,
        { parentId: rootId, question: "Child", goal: "Child" },
        ports,
      ),
    );
    const childId = snapshot.nodes[rootId]?.childIds[0];
    if (!childId || !threadId || !criterion) {
      throw new Error("missing parked-state fixtures");
    }

    const parked = unwrap(parkNode(snapshot, { nodeId: rootId }));
    expect(parked.nodes[rootId]?.lifecycle).toBe("parked");
    expect(parked.pass.activeStack).toEqual([]);
    expect(parked.nodes[rootId]?.conversationThreadId).toBe(threadId);
    expect(parked.nodes[rootId]?.definitionOfDone[0]?.id).toBe(criterion.id);
    expect(parked.nodes[rootId]?.childIds).toEqual([childId]);
    expect(parked.nodes[childId]?.parentId).toBe(rootId);
    assertActiveBijection(parked);

    const resumed = unwrap(resumeNode(parked, { nodeId: rootId }));
    expect(resumed.nodes[rootId]?.lifecycle).toBe("active");
    expect(resumed.pass.activeStack).toEqual([rootId]);
    expect(resumed.nodes[rootId]?.conversationThreadId).toBe(threadId);
    expect(resumed.nodes[rootId]?.definitionOfDone[0]?.description).toBe(
      "Keep this criterion",
    );
    assertActiveBijection(resumed);
  });

  it("rejects parking a node that is not the Active Stack leaf", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const { snapshot, childId } = createActivatedChild(
      parentActive,
      rootId,
      "Leaf",
      ports,
    );
    const withLeaf = unwrap(
      activateNode(snapshot, { nodeId: childId }),
    );
    expectError(parkNode(withLeaf, { nodeId: rootId }), "NotActiveStackLeaf");
    expect(withLeaf.nodes[rootId]?.lifecycle).toBe("active");
    expect(withLeaf.pass.activeStack).toEqual([rootId, childId]);
  });

  it("returnToParent only changes Current Focus", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const { snapshot, childId } = createActivatedChild(
      parentActive,
      rootId,
      "Child",
      ports,
    );
    const focused = unwrap(focusNode(snapshot, { nodeId: childId }));
    const returned = unwrap(returnToParent(focused));
    expect(returned.pass.currentFocusNodeId).toBe(rootId);
    expect(returned.pass.activeStack).toEqual(focused.pass.activeStack);
    expect(returned.nodes[childId]?.lifecycle).toBe(focused.nodes[childId]?.lifecycle);
    expect(returned.nodes[rootId]?.lifecycle).toBe("active");
  });

  it("does not change focus when parking or resuming", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const first = started.pass.rootNodeIds[0];
    const second = started.pass.rootNodeIds[1];
    if (!first || !second) {
      throw new Error("missing roots");
    }
    let snapshot = unwrap(focusNode(started, { nodeId: second }));
    snapshot = unwrap(activateNode(snapshot, { nodeId: first }));
    const parked = unwrap(parkNode(snapshot, { nodeId: first }));
    expect(parked.pass.currentFocusNodeId).toBe(second);
    const resumed = unwrap(resumeNode(parked, { nodeId: first }));
    expect(resumed.pass.currentFocusNodeId).toBe(second);
  });
});
