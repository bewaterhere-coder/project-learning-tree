import type { DomainSnapshot, NodeId } from "../../domain/index.js";

export type ActivateLabel = "startLearning" | "enterQuestion";

export interface ActionAvailability {
  canActivate: boolean;
  activateLabel: ActivateLabel;
  canPark: boolean;
  canResume: boolean;
  canClose: boolean;
  canReturnToParent: boolean;
}

export function activateLabelFor(
  node: {
    parentId?: NodeId;
  },
  projectRootId?: NodeId,
): ActivateLabel {
  if (node.parentId === undefined || node.parentId === projectRootId) {
    return "startLearning";
  }
  return "enterQuestion";
}

export function selectActionAvailability(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): ActionAvailability {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return {
      canActivate: false,
      activateLabel: "startLearning",
      canPark: false,
      canResume: false,
      canClose: false,
      canReturnToParent: false,
    };
  }

  if (snapshot.pass.projectRootNodeId === nodeId) {
    return {
      canActivate: false,
      activateLabel: "enterQuestion",
      canPark: false,
      canResume: false,
      canClose: false,
      canReturnToParent: false,
    };
  }

  const stackLeaf = snapshot.pass.activeStack[snapshot.pass.activeStack.length - 1];
  return {
    canActivate: node.lifecycle === "open" || node.lifecycle === "active",
    activateLabel: activateLabelFor(node, snapshot.pass.projectRootNodeId),
    canPark: node.lifecycle === "active" && stackLeaf === node.id,
    canResume: node.lifecycle === "parked",
    canClose: node.lifecycle === "active",
    canReturnToParent:
      node.parentId !== undefined &&
      node.parentId !== snapshot.pass.projectRootNodeId,
  };
}
