import {
  isBlocked,
  unresolvedBlockingChildIds,
  type DomainSnapshot,
  type NodeId,
  type NodeLifecycle,
} from "../../domain/index.js";
import { selectCloseReadiness } from "./close-readiness.js";

export interface TreeNodeView {
  id: NodeId;
  parentId?: NodeId;
  question: string;
  goal: string;
  lifecycle: NodeLifecycle;
  isBlocked: boolean;
  unresolvedBlockerCount: number;
  isOnActiveStack: boolean;
  isActiveStackLeaf: boolean;
  isCurrentFocus: boolean;
  isProjectRoot: boolean;
  /** True when convergence/readiness allows Complete (not merely non-closed). */
  canComplete: boolean;
}

export interface TreeEdgeView {
  parentId: NodeId;
  childId: NodeId;
  isOnActiveStack: boolean;
  isBlocking: boolean;
  isReceded: boolean;
}

export interface TreeViewModel {
  nodes: TreeNodeView[];
  edges: TreeEdgeView[];
  activeStack: NodeId[];
  currentFocusNodeId?: NodeId;
  rootNodeIds: NodeId[];
}

export function selectTreeViewModel(snapshot: DomainSnapshot): TreeViewModel {
  const stack = snapshot.pass.activeStack;
  const onStack = new Set(stack);
  const leaf = stack[stack.length - 1];
  const stackPairs = new Set<string>();
  for (let index = 1; index < stack.length; index += 1) {
    const parentId = stack[index - 1];
    const childId = stack[index];
    if (parentId !== undefined && childId !== undefined) {
      stackPairs.add(`${parentId}->${childId}`);
    }
  }

  const nodes: TreeNodeView[] = [];
  const edges: TreeEdgeView[] = [];
  const visited = new Set<NodeId>();

  const visit = (nodeId: NodeId): void => {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    const node = snapshot.nodes[nodeId];
    if (!node) {
      return;
    }
    nodes.push({
      id: node.id,
      parentId: node.parentId,
      question: node.question,
      goal: node.goal,
      lifecycle: node.lifecycle,
      isBlocked: isBlocked(snapshot, node.id),
      unresolvedBlockerCount: unresolvedBlockingChildIds(snapshot, node.id)
        .length,
      isOnActiveStack: onStack.has(node.id),
      isActiveStackLeaf: leaf === node.id,
      isCurrentFocus: snapshot.pass.currentFocusNodeId === node.id,
      isProjectRoot: snapshot.pass.projectRootNodeId === node.id,
      canComplete: selectCloseReadiness(snapshot, node.id).allowed,
    });
    for (const childId of node.childIds) {
      const child = snapshot.nodes[childId];
      const isOnActiveStack = stackPairs.has(`${node.id}->${childId}`);
      const childLifecycle = child?.lifecycle;
      edges.push({
        parentId: node.id,
        childId,
        isOnActiveStack,
        isBlocking: node.blockingChildIds.includes(childId),
        isReceded:
          !isOnActiveStack &&
          (childLifecycle === "parked" || childLifecycle === "closed"),
      });
      visit(childId);
    }
  };

  for (const rootId of snapshot.pass.rootNodeIds) {
    visit(rootId);
  }

  return {
    nodes,
    edges,
    activeStack: [...stack],
    currentFocusNodeId: snapshot.pass.currentFocusNodeId,
    rootNodeIds: [...snapshot.pass.rootNodeIds],
  };
}
