import { describe, expect, it } from "vitest";
import {
  activateBlockingChild,
  activateNode,
  createBlockingChild,
  focusNode,
  isBlocked,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createActivatedChild,
  createProjectWithRoots,
  expectError,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("blocking children", () => {
  it("4. creates a Blocking Child from an Active node", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q2"]),
    );
    const stackBefore = [...parentActive.pass.activeStack];
    const focusBefore = parentActive.pass.currentFocusNodeId;

    const snapshot = unwrap(
      createBlockingChild(
        parentActive,
        { parentId: rootId, question: "Q2.1", goal: "Unblock Q2" },
        ports,
      ),
    );
    const childId = snapshot.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }

    expect(snapshot.nodes[childId]?.lifecycle).toBe("open");
    expect(snapshot.nodes[childId]?.parentId).toBe(rootId);
    expect(snapshot.nodes[rootId]?.blockingChildIds).toEqual([childId]);
    expect(snapshot.pass.activeStack).toEqual(stackBefore);
    expect(snapshot.pass.currentFocusNodeId).toBe(focusBefore);
    expect(Object.keys(snapshot.nodes)).toHaveLength(2);
    assertActiveBijection(snapshot);
  });

  it("5-7. allows multiple unresolved Blocking Children and only one active branch", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q2"]),
    );
    const first = createActivatedChild(parentActive, rootId, "Q2.1", ports);
    const second = createActivatedChild(first.snapshot, rootId, "Q2.2", ports);
    expect(second.snapshot.nodes[rootId]?.blockingChildIds).toEqual([
      first.childId,
      second.childId,
    ]);
    expect(isBlocked(second.snapshot, rootId)).toBe(true);

    const activatedFirst = unwrap(
      activateBlockingChild(second.snapshot, {
        parentId: rootId,
        childId: first.childId,
      }),
    );
    expect(activatedFirst.pass.activeStack).toEqual([rootId, first.childId]);
    expect(activatedFirst.nodes[first.childId]?.lifecycle).toBe("active");
    expect(activatedFirst.nodes[second.childId]?.lifecycle).toBe("open");
    assertActiveBijection(activatedFirst);

    const switched = unwrap(
      activateNode(activatedFirst, { nodeId: second.childId }),
    );
    expect(switched.pass.activeStack).toEqual([rootId, second.childId]);
    expect(switched.nodes[second.childId]?.lifecycle).toBe("active");
    expect(switched.nodes[first.childId]?.lifecycle).toBe("open");
    expect(switched.nodes[first.childId]?.lifecycle).not.toBe("active");
    assertActiveBijection(switched);

    expectError(
      activateBlockingChild(switched, {
        parentId: rootId,
        childId: first.childId,
      }),
      "InvalidActiveStack",
    );
  });

  it("8-9. parent stays derived Blocked until the final Blocking Child closes", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q2"]),
    );
    const first = createActivatedChild(parentActive, rootId, "Q2.1", ports);
    const second = createActivatedChild(first.snapshot, rootId, "Q2.2", ports);
    let snapshot = unwrap(
      activateBlockingChild(second.snapshot, {
        parentId: rootId,
        childId: first.childId,
      }),
    );
    expect(isBlocked(snapshot, rootId)).toBe(true);

    snapshot = closePrepared(snapshot, first.childId, ports);
    expect(snapshot.nodes[first.childId]?.lifecycle).toBe("closed");
    expect(snapshot.pass.activeStack).toEqual([rootId]);
    expect(isBlocked(snapshot, rootId)).toBe(true);
    expect(snapshot.nodes[rootId]?.lifecycle).toBe("active");

    snapshot = unwrap(
      activateBlockingChild(snapshot, {
        parentId: rootId,
        childId: second.childId,
      }),
    );
    snapshot = closePrepared(snapshot, second.childId, ports);
    expect(isBlocked(snapshot, rootId)).toBe(false);
    expect(snapshot.pass.activeStack).toEqual([rootId]);
    assertActiveBijection(snapshot);
  });

  it("does not change Current Focus when activating a blocking child", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q2", "Other"]),
    );
    const otherId = coreQuestionIds(parentActive)[1];
    if (!otherId) {
      throw new Error("missing other");
    }
    const { snapshot, childId } = createActivatedChild(
      parentActive,
      rootId,
      "Q2.1",
      ports,
    );
    const focused = unwrap(focusNode(snapshot, { nodeId: otherId }));
    const activated = unwrap(
      activateBlockingChild(focused, { parentId: rootId, childId }),
    );
    expect(activated.pass.currentFocusNodeId).toBe(otherId);
    expect(activated.pass.activeStack).toEqual([rootId, childId]);
  });

  it("rejects creating a blocking child from a non-active parent", () => {
    const ports = sequentialPorts();
    const snapshot = createProjectWithRoots(ports, ["Q1"]);
    const rootId = coreQuestionIds(snapshot)[0];
    if (!rootId) {
      throw new Error("missing root");
    }
    expectError(
      createBlockingChild(
        snapshot,
        { parentId: rootId, question: "Nope", goal: "Nope" },
        ports,
      ),
      "InvalidLifecycleTransition",
    );
  });

  it("does not store blocked as a lifecycle after blockers appear", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q2"]),
    );
    const { snapshot } = createActivatedChild(parentActive, rootId, "Q2.1", ports);
    expect(snapshot.nodes[rootId]?.lifecycle).toBe("active");
    expect(isBlocked(snapshot, rootId)).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('"lifecycle":"blocked"');
  });
});
