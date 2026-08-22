import { describe, expect, it } from "vitest";
import {
  activateNode,
  closeNode,
  isBlocked,
  reopenNode,
  setNodeSummary,
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

describe("reopen", () => {
  it("19. rejects implicit reopening of a Closed node", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closed = closePrepared(active, rootId, ports);
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
    expectError(activateNode(closed, { nodeId: rootId }), "InvalidLifecycleTransition");
    expectError(
      closeNode(closed, { nodeId: rootId }),
      "InvalidLifecycleTransition",
    );
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
  });

  it("20. rejects explicit reopen when reason is empty", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closed = closePrepared(active, rootId, ports);
    expectError(
      reopenNode(closed, { nodeId: rootId, reason: "   " }, ports),
      "ReopenReasonRequired",
    );
    expectError(
      reopenNode(closed, { nodeId: rootId, reason: "" }, ports),
      "ReopenReasonRequired",
    );
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
  });

  it("21-22. reopens with a reason, preserves history, and records a ReopenEvent", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closed = closePrepared(active, rootId, ports);
    const before = closed.nodes[rootId];
    if (!before) {
      throw new Error("missing closed node");
    }
    const focusBefore = closed.pass.currentFocusNodeId;
    const result = reopenNode(
      closed,
      { nodeId: rootId, reason: "Need a deeper pass" },
      ports,
    );
    const snapshot = unwrap(result);
    const reopened = snapshot.nodes[rootId];
    if (!reopened) {
      throw new Error("missing reopened node");
    }

    expect(reopened.lifecycle).toBe("open");
    expect(snapshot.pass.activeStack).toEqual([]);
    expect(snapshot.pass.currentFocusNodeId).toBe(focusBefore);
    expect(reopened.conversationThreadId).toBe(before.conversationThreadId);
    expect(reopened.summary).toBe(before.summary);
    expect(reopened.evidence).toEqual(before.evidence);
    expect(reopened.definitionOfDone).toEqual(before.definitionOfDone);
    expect(reopened.childIds).toEqual(before.childIds);
    expect(reopened.reopenHistory).toHaveLength(1);
    expect(reopened.reopenHistory[0]?.reason).toBe("Need a deeper pass");
    expect(reopened.reopenHistory[0]?.reopenedAt).toBe("2026-01-01T00:00:00.000Z");
    if (result.ok) {
      expect(result.events.some((event) => event.type === "NodeReopened")).toBe(true);
    }
    assertActiveBijection(snapshot);
  });

  it("reopens a parent that has children and derives Blocked from child lifecycle", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const { snapshot: withChild, childId } = createActivatedChild(
      active,
      rootId,
      "Child",
      ports,
    );
    let snapshot = unwrap(activateNode(withChild, { nodeId: childId }));
    snapshot = closePrepared(snapshot, childId, ports);
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: rootId, summary: "parent done" }));
    snapshot = unwrap(closeNode(snapshot, { nodeId: rootId }));

    const reopenedParent = unwrap(
      reopenNode(snapshot, { nodeId: rootId, reason: "Parent needs revision" }, ports),
    );
    expect(reopenedParent.nodes[rootId]?.childIds).toEqual([childId]);
    expect(reopenedParent.nodes[childId]?.lifecycle).toBe("closed");
    expect(isBlocked(reopenedParent, rootId)).toBe(false);

    const reopenedChild = unwrap(
      reopenNode(
        reopenedParent,
        { nodeId: childId, reason: "Child also needs revision" },
        ports,
      ),
    );
    expect(reopenedChild.nodes[childId]?.lifecycle).toBe("open");
    expect(isBlocked(reopenedChild, rootId)).toBe(true);
  });
});
