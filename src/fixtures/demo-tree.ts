import {
  activateNode,
  addCoreQuestion,
  addCriterion,
  addEvidence,
  closeNode,
  createBlockingChild,
  createChild,
  createProject,
  declareCriterionSatisfied,
  defaultPorts,
  focusNode,
  linkEvidenceToCriterion,
  parkNode,
  setNodeSummary,
  type DomainResult,
  type DomainSnapshot,
  type NodeId,
  type Ports,
} from "../domain/index.js";

function coreQuestionIds(snapshot: DomainSnapshot): NodeId[] {
  return [...snapshot.pass.rootNodeIds];
}

export interface DemoTreeIds {
  q1: NodeId;
  q11: NodeId;
  q12: NodeId;
  q2: NodeId;
}

export interface DemoTreeFixture {
  snapshot: DomainSnapshot;
  ids: DemoTreeIds;
}

export interface BlockedBranchIds {
  parent: NodeId;
  childA: NodeId;
  childB: NodeId;
}

export interface BlockedBranchFixture {
  snapshot: DomainSnapshot;
  ids: BlockedBranchIds;
}

export interface ClosableNodeOptions {
  description?: string;
  evidenceRequired?: boolean;
  evidenceType?: string;
  evidenceReference?: string;
  summary?: string;
  includeSummary?: boolean;
  includeEvidence?: boolean;
  satisfyCriterion?: boolean;
}

function unwrap(result: DomainResult<DomainSnapshot>, context: string): DomainSnapshot {
  if (!result.ok) {
    throw new Error(`${context}: ${result.error.kind}`);
  }
  return result.snapshot;
}

export function sequentialFixturePorts(start = 0): Ports {
  let sequence = start;
  return {
    now: () => "2026-08-22T00:00:00.000Z",
    id: () => `fix-${++sequence}`,
  };
}

export function createClosableNodeFixture(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
  ports: Ports = defaultPorts(),
  options: ClosableNodeOptions = {},
): DomainSnapshot {
  const evidenceRequired = options.evidenceRequired ?? true;
  const includeEvidence = options.includeEvidence ?? evidenceRequired;
  const includeSummary = options.includeSummary ?? true;
  const satisfyCriterion = options.satisfyCriterion ?? true;
  let next = unwrap(
    addCriterion(
      snapshot,
      {
        nodeId,
        description: options.description ?? "Understood at the target depth",
        required: true,
        evidenceRequired,
      },
      ports,
    ),
    "addCriterion",
  );
  const criterionId = next.nodes[nodeId]?.definitionOfDone.at(-1)?.id;
  if (!criterionId) {
    throw new Error("createClosableNodeFixture: missing criterion");
  }

  if (includeEvidence) {
    next = unwrap(
      addEvidence(
        next,
        {
          nodeId,
          type: options.evidenceType ?? "note",
          reference: options.evidenceReference ?? `evidence:${nodeId}`,
        },
        ports,
      ),
      "addEvidence",
    );
    const evidenceId = next.nodes[nodeId]?.evidence.at(-1)?.id;
    if (!evidenceId) {
      throw new Error("createClosableNodeFixture: missing evidence");
    }
    next = unwrap(
      linkEvidenceToCriterion(next, { nodeId, criterionId, evidenceId }),
      "linkEvidenceToCriterion",
    );
  }

  if (satisfyCriterion) {
    next = unwrap(
      declareCriterionSatisfied(next, { nodeId, criterionId }),
      "declareCriterionSatisfied",
    );
  }

  if (!includeSummary) {
    return next;
  }

  return unwrap(
    setNodeSummary(next, {
      nodeId,
      summary: options.summary ?? "Resolved at L1.",
    }),
    "setNodeSummary",
  );
}

export function createBlockedBranchFixture(
  ports: Ports = sequentialFixturePorts(),
): BlockedBranchFixture {
  let snapshot = unwrap(createProject({ name: "Blocked Branch Fixture" }, ports), "createProject");
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Parent", goal: "Understand parent", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion",
  );
  const parent = coreQuestionIds(snapshot)[0];
  if (!parent) {
    throw new Error("createBlockedBranchFixture: missing parent");
  }
  snapshot = unwrap(activateNode(snapshot, { nodeId: parent }), "activateNode");
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      { parentId: parent, question: "Child A", goal: "Unblock parent via A" },
      ports,
    ),
    "createBlockingChild A",
  );
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      { parentId: parent, question: "Child B", goal: "Unblock parent via B" },
      ports,
    ),
    "createBlockingChild B",
  );
  const childA = snapshot.nodes[parent]?.childIds[0];
  const childB = snapshot.nodes[parent]?.childIds[1];
  if (!childA || !childB) {
    throw new Error("createBlockedBranchFixture: missing children");
  }
  return { snapshot, ids: { parent, childA, childB } };
}

export function createDemoTreeFixture(
  ports: Ports = sequentialFixturePorts(),
): DemoTreeFixture {
  let snapshot = unwrap(
    createProject({ name: "M2 Demo Tree", source: "fixture" }, ports),
    "createProject",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Q1", goal: "Understand Q1", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion Q1",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Q2", goal: "Understand Q2", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion Q2",
  );
  const [q1, q2] = coreQuestionIds(snapshot);
  if (!q1 || !q2) {
    throw new Error("createDemoTreeFixture: missing roots");
  }

  snapshot = unwrap(activateNode(snapshot, { nodeId: q1 }), "activateNode Q1");
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      { parentId: q1, question: "Q1.1", goal: "Unblock Q1 via Q1.1" },
      ports,
    ),
    "createBlockingChild Q1.1",
  );
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      { parentId: q1, question: "Q1.2", goal: "Unblock Q1 via Q1.2" },
      ports,
    ),
    "createBlockingChild Q1.2",
  );
  const q11 = snapshot.nodes[q1]?.childIds[0];
  const q12 = snapshot.nodes[q1]?.childIds[1];
  if (!q11 || !q12) {
    throw new Error("createDemoTreeFixture: missing children");
  }

  snapshot = unwrap(activateNode(snapshot, { nodeId: q11 }), "activateNode Q1.1");
  snapshot = createClosableNodeFixture(snapshot, q11, ports, {
    description: "Q1.1 is understood",
    evidenceReference: "demo-evidence-q1.1",
    summary: "Q1.1 is resolved at L1.",
  });
  snapshot = unwrap(closeNode(snapshot, { nodeId: q11 }), "closeNode Q1.1");
  snapshot = unwrap(activateNode(snapshot, { nodeId: q12 }), "activateNode Q1.2");
  snapshot = unwrap(parkNode(snapshot, { nodeId: q12 }), "parkNode Q1.2");
  snapshot = unwrap(focusNode(snapshot, { nodeId: q2 }), "focusNode Q2");

  return { snapshot, ids: { q1, q11, q12, q2 } };
}

export interface SecondDemoTreeIds {
  alpha: NodeId;
  alpha1: NodeId;
  beta: NodeId;
}

export interface SecondDemoTreeFixture {
  snapshot: DomainSnapshot;
  ids: SecondDemoTreeIds;
}

export interface MixedChildrenIds {
  parent: NodeId;
  ordinary: NodeId;
  blocking: NodeId;
}

export interface MixedChildrenFixture {
  snapshot: DomainSnapshot;
  ids: MixedChildrenIds;
}

export function createMixedChildrenFixture(
  ports: Ports = sequentialFixturePorts(2000),
): MixedChildrenFixture {
  let snapshot = unwrap(
    createProject({ name: "M2.3 Mixed Children", source: "fixture" }, ports),
    "createProject mixed",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Parent", goal: "Understand parent", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion Parent",
  );
  const parent = coreQuestionIds(snapshot)[0];
  if (!parent) {
    throw new Error("createMixedChildrenFixture: missing parent");
  }
  snapshot = unwrap(activateNode(snapshot, { nodeId: parent }), "activateNode");
  snapshot = unwrap(
    createChild(
      snapshot,
      {
        parentId: parent,
        question: "Ordinary child",
        goal: "Explore without blocking",
      },
      ports,
    ),
    "createChild ordinary",
  );
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      {
        parentId: parent,
        question: "Blocking child",
        goal: "Unblock parent",
      },
      ports,
    ),
    "createBlockingChild",
  );
  const ordinary = snapshot.nodes[parent]?.childIds[0];
  const blocking = snapshot.nodes[parent]?.childIds[1];
  if (!ordinary || !blocking) {
    throw new Error("createMixedChildrenFixture: missing children");
  }
  snapshot = unwrap(focusNode(snapshot, { nodeId: parent }), "focusNode");
  return { snapshot, ids: { parent, ordinary, blocking } };
}

export function createSecondDemoTreeFixture(
  ports: Ports = sequentialFixturePorts(1000),
): SecondDemoTreeFixture {
  let snapshot = unwrap(
    createProject({ name: "M2.1 Demo Tree B", source: "fixture" }, ports),
    "createProject B",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Alpha", goal: "Understand Alpha", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion Alpha",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Beta", goal: "Understand Beta", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion Beta",
  );
  const [alpha, beta] = coreQuestionIds(snapshot);
  if (!alpha || !beta) {
    throw new Error("createSecondDemoTreeFixture: missing roots");
  }
  snapshot = unwrap(
    activateNode(snapshot, { nodeId: alpha }),
    "activateNode Alpha",
  );
  snapshot = unwrap(
    createBlockingChild(
      snapshot,
      {
        parentId: alpha,
        question: "Alpha.1",
        goal: "Unblock Alpha via Alpha.1",
      },
      ports,
    ),
    "createBlockingChild Alpha.1",
  );
  const alpha1 = snapshot.nodes[alpha]?.childIds[0];
  if (!alpha1) {
    throw new Error("createSecondDemoTreeFixture: missing Alpha.1");
  }
  snapshot = unwrap(
    focusNode(snapshot, { nodeId: alpha1 }),
    "focusNode Alpha.1",
  );
  return { snapshot, ids: { alpha, alpha1, beta } };
}
