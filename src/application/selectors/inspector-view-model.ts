import {
  isBlocked,
  type Criterion,
  type DomainSnapshot,
  type Evidence,
  type LearningDepth,
  type NodeId,
  type NodeLifecycle,
} from "../../domain/index.js";

export interface InspectorViewModel {
  hasFocus: boolean;
  nodeId?: NodeId;
  parentId?: NodeId;
  question?: string;
  goal?: string;
  targetDepth?: LearningDepth;
  lifecycle?: NodeLifecycle;
  isBlocked?: boolean;
  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;
}

export function selectInspectorViewModel(
  snapshot: DomainSnapshot,
): InspectorViewModel {
  const nodeId = snapshot.pass.currentFocusNodeId;
  if (nodeId === undefined) {
    return { hasFocus: false, definitionOfDone: [], evidence: [] };
  }
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return { hasFocus: false, definitionOfDone: [], evidence: [] };
  }
  return {
    hasFocus: true,
    nodeId: node.id,
    parentId: node.parentId,
    question: node.question,
    goal: node.goal,
    targetDepth: node.targetDepth,
    lifecycle: node.lifecycle,
    isBlocked: isBlocked(snapshot, node.id),
    definitionOfDone: node.definitionOfDone.map((criterion) => ({
      ...criterion,
      evidenceIds: [...criterion.evidenceIds],
    })),
    evidence: node.evidence.map((item) => ({ ...item })),
    summary: node.summary,
  };
}
