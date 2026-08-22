import { describe, expect, it } from "vitest";
import {
  activateBlockingChild,
  activateNode,
  closeNode,
  createBlockingChild,
  createChild,
  evaluateConvergence,
  isBlocked,
  markChildBlocking,
  parkNode,
  resumeNode,
  unmarkChildBlocking,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createActivatedChild,
  createProjectWithRoots,
  expectError,
  prepareCloseable,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

function assertSubset(parent: { childIds: string[]; blockingChildIds: string[] }) {
  expect(new Set(parent.blockingChildIds).size).toBe(parent.blockingChildIds.length);
  expect(new Set(parent.childIds).size).toBe(parent.childIds.length);
  for (const id of parent.blockingChildIds) {
    expect(parent.childIds).toContain(id);
  }
}

describe("ordinary child authoring", () => {
  it("creates an open child on childIds only and leaves stack, focus, and parent lifecycle unchanged", () => {
    const ports = sequentialPorts();
    const { snapshot: parentActive, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const stackBefore = [...parentActive.pass.activeStack];
    const focusBefore = parentActive.pass.currentFocusNodeId;
    const parentLifecycle = parentActive.nodes[rootId]?.lifecycle;

    const snapshot = unwrap(
      createChild(
        parentActive,
        {
          parentId: rootId,
          question: "  What is X?  ",
          goal: "  Understand X  ",
        },
        ports,
      ),
    );
    const childId = snapshot.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }

    expect(snapshot.nodes[childId]?.lifecycle).toBe("open");
    expect(snapshot.nodes[childId]?.parentId).toBe(rootId);
    expect(snapshot.nodes[childId]?.question).toBe("What is X?");
    expect(snapshot.nodes[childId]?.goal).toBe("Understand X");
    expect(snapshot.nodes[rootId]?.childIds).toEqual([childId]);
    expect(snapshot.nodes[rootId]?.blockingChildIds).toEqual([]);
    expect(snapshot.pass.activeStack).toEqual(stackBefore);
    expect(snapshot.pass.currentFocusNodeId).toBe(focusBefore);
    expect(snapshot.nodes[rootId]?.lifecycle).toBe(parentLifecycle);
    assertSubset(snapshot.nodes[rootId]!);
    assertActiveBijection(snapshot);
  });

  it("allows createChild from open, active, and parked parents, but rejects closed parents", () => {
    const ports = sequentialPorts();
    const open = createProjectWithRoots(ports, ["Root"]);
    const rootId = coreQuestionIds(open)[0];
    if (!rootId) {
      throw new Error("missing root");
    }

    const fromOpen = unwrap(
      createChild(
        open,
        { parentId: rootId, question: "From open", goal: "Explore" },
        ports,
      ),
    );
    expect(fromOpen.nodes[rootId]?.childIds).toHaveLength(1);

    const active = unwrap(activateNode(fromOpen, { nodeId: rootId }));
    const fromActive = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "From active", goal: "Explore" },
        ports,
      ),
    );
    expect(fromActive.nodes[rootId]?.childIds).toHaveLength(2);

    const parked = unwrap(parkNode(fromActive, { nodeId: rootId }));
    const fromParked = unwrap(
      createChild(
        parked,
        { parentId: rootId, question: "From parked", goal: "Explore" },
        ports,
      ),
    );
    expect(fromParked.nodes[rootId]?.childIds).toHaveLength(3);
    expect(fromParked.nodes[rootId]?.blockingChildIds).toEqual([]);

    const closed = closePrepared(
      unwrap(resumeNode(fromParked, { nodeId: rootId })),
      rootId,
      ports,
    );
    expectError(
      createChild(
        closed,
        { parentId: rootId, question: "Too late", goal: "Nope" },
        ports,
      ),
      "InvalidLifecycleTransition",
    );
  });

  it("rejects empty or whitespace question and goal on createChild and createBlockingChild", () => {
    const ports = sequentialPorts();
    const { snapshot, rootId } = activateRoot(createProjectWithRoots(ports, ["P"]));

    expectError(
      createChild(snapshot, { parentId: rootId, question: "", goal: "G" }, ports),
      "QuestionRequired",
    );
    expectError(
      createChild(snapshot, { parentId: rootId, question: "   ", goal: "G" }, ports),
      "QuestionRequired",
    );
    expectError(
      createChild(snapshot, { parentId: rootId, question: "Q", goal: "" }, ports),
      "GoalRequired",
    );
    expectError(
      createChild(snapshot, { parentId: rootId, question: "Q", goal: "  " }, ports),
      "GoalRequired",
    );
    expectError(
      createBlockingChild(
        snapshot,
        { parentId: rootId, question: "", goal: "G" },
        ports,
      ),
      "QuestionRequired",
    );
    expectError(
      createBlockingChild(
        snapshot,
        { parentId: rootId, question: "Q", goal: "   " },
        ports,
      ),
      "GoalRequired",
    );
    expect(createChild(snapshot, { parentId: rootId, question: "", goal: "G" }, ports).ok).toBe(false);
    if (!createChild(snapshot, { parentId: rootId, question: "", goal: "G" }, ports).ok) {
      expect(snapshot.nodes[rootId]?.childIds).toEqual([]);
    }
  });

  it("lets an ordinary open child stay open while the parent still closes", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const withOrdinary = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "Side path", goal: "Explore" },
        ports,
      ),
    );
    const { snapshot: withBlocker, childId: blockerId } = createActivatedChild(
      withOrdinary,
      rootId,
      "Must solve",
      ports,
    );
    const blockerClosed = closePrepared(
      unwrap(
        activateBlockingChild(withBlocker, {
          parentId: rootId,
          childId: blockerId,
        }),
      ),
      blockerId,
      ports,
    );
    const prepared = prepareCloseable(blockerClosed, rootId, ports);
    expect(isBlocked(prepared, rootId)).toBe(false);
    const evaluation = evaluateConvergence(prepared, { nodeId: rootId });
    expect(evaluation.ok && evaluation.evaluation.canClose).toBe(true);
    const closed = unwrap(closeNode(prepared, { nodeId: rootId }));
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
    expect(closed.nodes[withOrdinary.nodes[rootId]!.childIds[0]!]?.lifecycle).toBe(
      "open",
    );
  });

  it("still rejects parent close while a blocking child is open", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const { snapshot } = createActivatedChild(active, rootId, "Blocker", ports);
    const prepared = prepareCloseable(snapshot, rootId, ports);
    expectError(closeNode(prepared, { nodeId: rootId }), "UnresolvedBlockingChildren");
  });

  it("activates an ordinary child through activateNode but not activateBlockingChild", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const created = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "Learn this", goal: "Explore" },
        ports,
      ),
    );
    const childId = created.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    const activated = unwrap(activateNode(created, { nodeId: childId }));
    expect(activated.pass.activeStack).toEqual([
      active.pass.projectRootNodeId,
      rootId,
      childId,
    ]);
    expect(activated.nodes[childId]?.lifecycle).toBe("active");
    expectError(
      activateBlockingChild(created, { parentId: rootId, childId }),
      "InvalidActiveStack",
    );
  });
});

describe("blocking relationship conversion", () => {
  it("marks and unmarks a direct child and updates convergence without changing stack or lifecycle", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const created = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "Maybe later", goal: "Explore" },
        ports,
      ),
    );
    const childId = created.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    const stackBefore = [...created.pass.activeStack];
    const focusBefore = created.pass.currentFocusNodeId;

    const marked = unwrap(
      markChildBlocking(created, { parentId: rootId, childId }),
    );
    expect(marked.nodes[rootId]?.blockingChildIds).toEqual([childId]);
    assertSubset(marked.nodes[rootId]!);
    expect(isBlocked(marked, rootId)).toBe(true);
    expect(marked.pass.activeStack).toEqual(stackBefore);
    expect(marked.pass.currentFocusNodeId).toBe(focusBefore);
    expect(marked.nodes[rootId]?.lifecycle).toBe("active");
    expect(marked.nodes[childId]?.lifecycle).toBe("open");
    expectError(
      closeNode(prepareCloseable(marked, rootId, ports), { nodeId: rootId }),
      "UnresolvedBlockingChildren",
    );

    const unmarked = unwrap(
      unmarkChildBlocking(marked, { parentId: rootId, childId }),
    );
    expect(unmarked.nodes[rootId]?.blockingChildIds).toEqual([]);
    assertSubset(unmarked.nodes[rootId]!);
    expect(isBlocked(unmarked, rootId)).toBe(false);
    const prepared = prepareCloseable(unmarked, rootId, ports);
    expect(unwrap(closeNode(prepared, { nodeId: rootId })).nodes[rootId]?.lifecycle).toBe(
      "closed",
    );
  });

  it("rejects a non-direct child and keeps relationship arrays unique and idempotent", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["A", "B"]);
    const [aId, bId] = coreQuestionIds(started);
    if (!aId || !bId) {
      throw new Error("missing roots");
    }
    const activeA = unwrap(activateNode(started, { nodeId: aId }));
    const withChild = unwrap(
      createChild(
        activeA,
        { parentId: aId, question: "A.1", goal: "Explore" },
        ports,
      ),
    );
    const childId = withChild.nodes[aId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }

    expectError(
      markChildBlocking(withChild, { parentId: aId, childId: bId }),
      "NotADirectChild",
    );
    expectError(
      unmarkChildBlocking(withChild, { parentId: aId, childId: bId }),
      "NotADirectChild",
    );

    const marked = unwrap(
      markChildBlocking(withChild, { parentId: aId, childId }),
    );
    const markedAgain = unwrap(
      markChildBlocking(marked, { parentId: aId, childId }),
    );
    expect(markedAgain.nodes[aId]?.blockingChildIds).toEqual([childId]);
    assertSubset(markedAgain.nodes[aId]!);

    const unmarked = unwrap(
      unmarkChildBlocking(markedAgain, { parentId: aId, childId }),
    );
    const unmarkedAgain = unwrap(
      unmarkChildBlocking(unmarked, { parentId: aId, childId }),
    );
    expect(unmarkedAgain.nodes[aId]?.blockingChildIds).toEqual([]);
  });

  it("rejects mark and unmark on a closed parent", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const created = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "Child", goal: "Explore" },
        ports,
      ),
    );
    const childId = created.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    const closed = closePrepared(created, rootId, ports);
    expectError(
      markChildBlocking(closed, { parentId: rootId, childId }),
      "InvalidLifecycleTransition",
    );
    expectError(
      unmarkChildBlocking(closed, { parentId: rootId, childId }),
      "InvalidLifecycleTransition",
    );
  });

  it("can mark a closed child without making it an unresolved blocker", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Parent"]),
    );
    const created = unwrap(
      createChild(
        active,
        { parentId: rootId, question: "Done already", goal: "Explore" },
        ports,
      ),
    );
    const childId = created.nodes[rootId]?.childIds[0];
    if (!childId) {
      throw new Error("missing child");
    }
    const childActive = unwrap(activateNode(created, { nodeId: childId }));
    const childClosed = closePrepared(childActive, childId, ports);
    const marked = unwrap(
      markChildBlocking(childClosed, { parentId: rootId, childId }),
    );
    expect(marked.nodes[rootId]?.blockingChildIds).toEqual([childId]);
    expect(isBlocked(marked, rootId)).toBe(false);
    const prepared = prepareCloseable(marked, rootId, ports);
    expect(unwrap(closeNode(prepared, { nodeId: rootId })).nodes[rootId]?.lifecycle).toBe(
      "closed",
    );
  });
});
