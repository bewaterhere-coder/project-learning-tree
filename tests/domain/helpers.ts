import { expect } from "vitest";
import {
  activateNode,
  addCoreQuestion,
  addCriterion,
  closeNode,
  createBlockingChild,
  createProject,
  declareCriterionSatisfied,
  setNodeSummary,
  type DomainResult,
  type DomainSnapshot,
  type NodeId,
  type Ports,
} from "../../src/domain/index.js";

export function sequentialPorts(): Ports {
  let sequence = 0;
  return {
    now: () => "2026-01-01T00:00:00.000Z",
    id: () => `id-${++sequence}`,
  };
}

export function unwrap(result: DomainResult<DomainSnapshot>): DomainSnapshot {
  if (!result.ok) {
    throw new Error(`expected success, got ${JSON.stringify(result.error)}`);
  }
  return result.snapshot;
}

export function expectError(
  result: DomainResult<DomainSnapshot>,
  kind: string,
): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.kind).toBe(kind);
  }
}

export function lifecycles(
  snapshot: DomainSnapshot,
): Record<string, string> {
  return Object.fromEntries(
    Object.values(snapshot.nodes).map((node) => [node.id, node.lifecycle]),
  );
}

export function assertActiveBijection(snapshot: DomainSnapshot): void {
  const onStack = new Set(snapshot.pass.activeStack);
  for (const node of Object.values(snapshot.nodes)) {
    expect(node.lifecycle === "active").toBe(onStack.has(node.id));
    expect(node.lifecycle).not.toBe("blocked");
    expect("blocked" in node).toBe(false);
  }
  for (const id of snapshot.pass.activeStack) {
    expect(snapshot.nodes[id]?.lifecycle).toBe("active");
  }
}


/** @deprecated Project Root removed; returns first core question id for transitional tests. */
export function requireProjectRootId(snapshot: DomainSnapshot): NodeId {
  const id = coreQuestionIds(snapshot)[0];
  if (!id) {
    throw new Error("missing project root / core question");
  }
  return id;
}

/** Top-level Core Questions (= pass.rootNodeIds after TASK-005 flatten). */
export function coreQuestionIds(snapshot: DomainSnapshot): NodeId[] {
  return [...snapshot.pass.rootNodeIds];
}

export function createProjectWithRoots(
  ports: Ports,
  questions: string[],
): DomainSnapshot {
  let snapshot = unwrap(createProject({ name: "Learning Tree" }, ports));
  for (const question of questions) {
    snapshot = unwrap(
      addCoreQuestion(snapshot, { question, goal: `Understand ${question}` }, ports),
    );
  }
  return snapshot;
}

/**
 * Activates the Nth Core Question (top-level root).
 * `rootId` is the Core Question id; stack is `[rootId]` (no Project Root).
 * `projectRootId` is kept as an alias of `rootId` for older call sites.
 */
export function activateRoot(
  snapshot: DomainSnapshot,
  rootIndex = 0,
): {
  snapshot: DomainSnapshot;
  rootId: NodeId;
  projectRootId: NodeId;
} {
  const rootId = coreQuestionIds(snapshot)[rootIndex];
  if (!rootId) {
    throw new Error("missing core question");
  }
  return {
    snapshot: unwrap(activateNode(snapshot, { nodeId: rootId })),
    rootId,
    projectRootId: rootId,
  };
}

export function prepareCloseable(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
  ports: Ports,
): DomainSnapshot {
  let next = unwrap(
    addCriterion(
      snapshot,
      {
        nodeId,
        description: "Understood",
        required: true,
        evidenceRequired: false,
      },
      ports,
    ),
  );
  const criterionId = next.nodes[nodeId]?.definitionOfDone[0]?.id;
  if (!criterionId) {
    throw new Error("missing criterion");
  }
  next = unwrap(
    declareCriterionSatisfied(next, { nodeId, criterionId }),
  );
  return unwrap(setNodeSummary(next, { nodeId, summary: "Resolved at L1." }));
}

export function closePrepared(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
  ports: Ports,
): DomainSnapshot {
  return unwrap(closeNode(prepareCloseable(snapshot, nodeId, ports), { nodeId }));
}

export function createActivatedChild(
  snapshot: DomainSnapshot,
  parentId: NodeId,
  question: string,
  ports: Ports,
): { snapshot: DomainSnapshot; childId: NodeId } {
  const created = createBlockingChild(
    snapshot,
    { parentId, question, goal: question },
    ports,
  );
  const next = unwrap(created);
  const childId = next.nodes[parentId]?.childIds.at(-1);
  if (!childId) {
    throw new Error("missing child");
  }
  return { snapshot: next, childId };
}
