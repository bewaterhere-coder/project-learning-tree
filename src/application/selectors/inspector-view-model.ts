import {
  isBlocked,
  unresolvedBlockingChildIds,
  type Criterion,
  type DomainSnapshot,
  type Evidence,
  type LearningDepth,
  type NodeId,
  type NodeLifecycle,
} from "../../domain/index.js";

export interface InspectorChildView {
  id: NodeId;
  question: string;
  lifecycle: NodeLifecycle;
  isBlocking: boolean;
  isUnresolvedBlocker: boolean;
}

export interface InspectorViewModel {
  hasFocus: boolean;
  nodeId?: NodeId;
  parentId?: NodeId;
  question?: string;
  goal?: string;
  targetDepth?: LearningDepth;
  lifecycle?: NodeLifecycle;
  isBlocked?: boolean;
  unresolvedBlockerCount?: number;
  children: InspectorChildView[];
  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;
}

export function selectInspectorViewModel(
  snapshot: DomainSnapshot,
): InspectorViewModel {
  const nodeId = snapshot.pass.currentFocusNodeId;
  if (nodeId === undefined) {
    return { hasFocus: false, children: [], definitionOfDone: [], evidence: [] };
  }
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return { hasFocus: false, children: [], definitionOfDone: [], evidence: [] };
  }
  const unresolved = new Set(unresolvedBlockingChildIds(snapshot, node.id));
  return {
    hasFocus: true,
    nodeId: node.id,
    parentId: node.parentId,
    question: node.question,
    goal: node.goal,
    targetDepth: node.targetDepth,
    lifecycle: node.lifecycle,
    isBlocked: isBlocked(snapshot, node.id),
    unresolvedBlockerCount: unresolved.size,
    children: node.childIds.flatMap((childId) => {
      const child = snapshot.nodes[childId];
      if (!child) {
        return [];
      }
      return [
        {
          id: child.id,
          question: child.question,
          lifecycle: child.lifecycle,
          isBlocking: node.blockingChildIds.includes(child.id),
          isUnresolvedBlocker: unresolved.has(child.id),
        },
      ];
    }),
    definitionOfDone: node.definitionOfDone.map((criterion) => ({
      ...criterion,
      evidenceIds: [...criterion.evidenceIds],
    })),
    evidence: node.evidence.map((item) => ({ ...item })),
    summary: node.summary,
  };
}
