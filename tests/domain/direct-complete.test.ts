import { describe, expect, it } from "vitest";
import {
  activateNode,
  closeNode,
  createChild,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  lifecycles,
  prepareCloseable,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("direct completion without Active Stack (TASK-006)", () => {
  it("closes an open Question when convergence is met without activateNode", () => {
    const ports = sequentialPorts();
    const open = createProjectWithRoots(ports, ["Q1"]);
    const rootId = coreQuestionIds(open)[0];
    if (!rootId) {
      throw new Error("missing core question");
    }
    expect(open.nodes[rootId]?.lifecycle).toBe("open");
    expect(open.pass.activeStack).toEqual([]);

    const prepared = prepareCloseable(open, rootId, ports);
    const closed = unwrap(closeNode(prepared, { nodeId: rootId }));

    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
    expect(closed.pass.activeStack).toEqual([]);
    assertActiveBijection(closed);
  });

  it("rejects close from open when convergence is not met", () => {
    const ports = sequentialPorts();
    const open = createProjectWithRoots(ports, ["Q1"]);
    const rootId = coreQuestionIds(open)[0];
    if (!rootId) {
      throw new Error("missing core question");
    }
    expectError(closeNode(open, { nodeId: rootId }), "SummaryRequired");
  });

  it("completing Question B does not mutate Question A activeStack or lifecycles", () => {
    const ports = sequentialPorts();
    const base = createProjectWithRoots(ports, ["Question A", "Question B"]);
    const [questionA, questionB] = coreQuestionIds(base);
    if (!questionA || !questionB) {
      throw new Error("missing core questions");
    }

    const { snapshot: onA, projectRootId } = activateRoot(base, 0);
    expect(onA.pass.activeStack).toEqual([projectRootId, questionA]);
    expect(onA.nodes[questionA]?.lifecycle).toBe("active");
    expect(onA.nodes[questionB]?.lifecycle).toBe("open");

    const withChild = unwrap(
      createChild(
        onA,
        {
          parentId: questionA,
          question: "A child",
          goal: "Deepen A",
        },
        ports,
      ),
    );
    const aChildId = withChild.nodes[questionA]?.childIds.at(-1);
    if (!aChildId) {
      throw new Error("missing A child");
    }

    const beforeLifecycles = lifecycles(withChild);
    const beforeStack = [...withChild.pass.activeStack];

    const preparedB = prepareCloseable(withChild, questionB, ports);
    const after = unwrap(closeNode(preparedB, { nodeId: questionB }));

    expect(after.nodes[questionB]?.lifecycle).toBe("closed");
    expect(after.pass.activeStack).toEqual(beforeStack);
    expect(after.nodes[questionA]?.lifecycle).toBe("active");
    expect(after.nodes[projectRootId]?.lifecycle).toBe("active");
    expect(after.nodes[aChildId]?.lifecycle).toBe(
      beforeLifecycles[aChildId],
    );

    const afterWithoutB = { ...lifecycles(after) };
    delete afterWithoutB[questionB];
    const beforeWithoutB = { ...beforeLifecycles };
    delete beforeWithoutB[questionB];
    // prepareCloseable only mutates B (criterion/summary); A path untouched
    expect(afterWithoutB).toEqual(beforeWithoutB);
    assertActiveBijection(after);
  });

  it("closing an active stack leaf only pops that leaf", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId, projectRootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closed = unwrap(
      closeNode(prepareCloseable(active, rootId, ports), { nodeId: rootId }),
    );
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
    expect(closed.pass.activeStack).toEqual([projectRootId]);
    expect(closed.nodes[projectRootId]?.lifecycle).toBe("active");
    assertActiveBijection(closed);
  });

  it("still allows activateNode for other paths without using it for complete", () => {
    const ports = sequentialPorts();
    const open = createProjectWithRoots(ports, ["Q1"]);
    const rootId = coreQuestionIds(open)[0];
    if (!rootId) {
      throw new Error("missing core question");
    }
    const active = unwrap(activateNode(open, { nodeId: rootId }));
    expect(active.nodes[rootId]?.lifecycle).toBe("active");
    assertActiveBijection(active);
  });
});
