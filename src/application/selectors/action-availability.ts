import type { DomainSnapshot, NodeId } from "../../domain/index.js";

export type ActivateLabel = "开始学习" | "进入这个问题";

export interface ActionAvailability {
  canActivate: boolean;
  activateLabel: ActivateLabel;
  canPark: boolean;
  canResume: boolean;
  canClose: boolean;
  canReturnToParent: boolean;
}

export function activateLabelFor(node: {
  parentId?: NodeId;
}): ActivateLabel {
  return node.parentId === undefined ? "开始学习" : "进入这个问题";
}

export function selectActionAvailability(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): ActionAvailability {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return {
      canActivate: false,
      activateLabel: "开始学习",
      canPark: false,
      canResume: false,
      canClose: false,
      canReturnToParent: false,
    };
  }

  const stackLeaf = snapshot.pass.activeStack[snapshot.pass.activeStack.length - 1];
  return {
    canActivate: node.lifecycle === "open" || node.lifecycle === "active",
    activateLabel: activateLabelFor(node),
    canPark: node.lifecycle === "active" && stackLeaf === node.id,
    canResume: node.lifecycle === "parked",
    canClose: node.lifecycle === "active",
    canReturnToParent: node.parentId !== undefined,
  };
}
