import type { Edge, Node } from "@xyflow/react";
import type { NodeId, TreeNodeView, TreeViewModel } from "../../application/index.js";
import {
  resolveNodePosition,
  type NodePosition,
} from "../../workspace/index.js";
import { computeLayout, NODE_HEIGHT, NODE_WIDTH } from "./layout.js";

type LearningNodeData = TreeNodeView & Record<string, unknown>;
export type LearningFlowNode = Node<LearningNodeData, "learningNode">;

export function toReactFlow(
  model: TreeViewModel,
  savedPositions: Record<NodeId, NodePosition> = {},
): {
  nodes: LearningFlowNode[];
  edges: Edge[];
} {
  const autoPositions = computeLayout(model);
  const nodes: LearningFlowNode[] = model.nodes.map((node) => ({
    id: node.id,
    type: "learningNode",
    position: resolveNodePosition(node.id, savedPositions, autoPositions),
    data: { ...node },
    selected: node.isCurrentFocus,
    draggable: true,
    connectable: false,
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  }));
  const edges: Edge[] = model.edges.map((edge) => {
    const pathClass = edge.isOnActiveStack
      ? "edge-active-stack"
      : edge.isReceded
        ? "edge-quiet"
        : "edge-default";
    return {
      id: `${edge.parentId}->${edge.childId}`,
      source: edge.parentId,
      target: edge.childId,
      className: [pathClass, edge.isBlocking ? "edge-blocking" : ""]
        .filter(Boolean)
        .join(" "),
      markerEnd: edge.isBlocking ? "url(#blocking-tick)" : undefined,
    };
  });
  return { nodes, edges };
}
