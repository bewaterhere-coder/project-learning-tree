import type { DomainSnapshot, LearningNode, NodeId } from "./types.js";
import type { DomainError } from "./errors.js";

export function getNode(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): LearningNode | undefined {
  return snapshot.nodes[nodeId];
}

export function requireNode(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): { ok: true; node: LearningNode } | { ok: false; error: DomainError } {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return { ok: false, error: { kind: "NodeNotFound", nodeId } };
  }
  return { ok: true, node };
}

export function cloneNode(node: LearningNode): LearningNode {
  return {
    ...node,
    childIds: [...node.childIds],
    blockingChildIds: [...node.blockingChildIds],
    definitionOfDone: node.definitionOfDone.map((criterion) => ({
      ...criterion,
      evidenceIds: [...criterion.evidenceIds],
    })),
    evidence: node.evidence.map((item) => ({ ...item })),
    reopenHistory: node.reopenHistory.map((event) => ({ ...event })),
  };
}

export function cloneSnapshot(snapshot: DomainSnapshot): DomainSnapshot {
  const nodes: DomainSnapshot["nodes"] = {};
  for (const [id, node] of Object.entries(snapshot.nodes)) {
    nodes[id] = cloneNode(node);
  }
  return {
    project: {
      ...snapshot.project,
      passIds: [...snapshot.project.passIds],
    },
    pass: {
      ...snapshot.pass,
      rootNodeIds: [...snapshot.pass.rootNodeIds],
      activeStack: [...snapshot.pass.activeStack],
      frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
    },
    nodes,
  };
}

export function putNode(
  snapshot: DomainSnapshot,
  node: LearningNode,
): DomainSnapshot {
  const next = cloneSnapshot(snapshot);
  next.nodes[node.id] = node;
  return next;
}
