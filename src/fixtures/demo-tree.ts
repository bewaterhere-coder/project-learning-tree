import {
  activateNode,
  addCoreQuestion,
  addCriterion,
  addEvidence,
  closeNode,
  createBlockingChild,
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
}

function unwrap(result: DomainResult<DomainSnapshot>, context: string): DomainSnapshot {
  if (!result.ok) {
    throw new Error(`${context}: ${result.error.kind}`);
  }
  return result.snapshot;
}

export function sequentialFixturePorts(): Ports {
  let sequence = 0;
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

  if (evidenceRequired) {
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

  next = unwrap(
    declareCriterionSatisfied(next, { nodeId, criterionId }),
    "declareCriterionSatisfied",
  );
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
  let snapshot = unwrap(
    createProject({ name: "Blocked Branch Fixture" }, ports),
    "createProject",
  );
  snapshot = unwrap(
    addCoreQuestion(
      snapshot,
      { question: "Parent", goal: "Understand parent", targetDepth: "L1" },
      ports,
    ),
    "addCoreQuestion",
  );
  const parent = snapshot.pass.rootNodeIds[0];
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
  const q1 = snapshot.pass.rootNodeIds[0];
  const q2 = snapshot.pass.rootNodeIds[1];
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
