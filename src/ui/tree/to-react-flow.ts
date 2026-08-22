import type { Edge, Node } from "@xyflow/react";
import type { TreeNodeView, TreeViewModel } from "../../application/index.js";
import { computeLayout, NODE_HEIGHT, NODE_WIDTH } from "./layout.js";

type LearningNodeData = TreeNodeView & Record<string, unknown>;
export type LearningFlowNode = Node<LearningNodeData, "learningNode">;

export function toReactFlow(model: TreeViewModel): {
  nodes: LearningFlowNode[];
  edges: Edge[];
} {
  const positions = computeLayout(model);
  const nodes: LearningFlowNode[] = model.nodes.map((node) => ({
    id: node.id,
    type: "learningNode",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { ...node },
    selected: node.isCurrentFocus,
    draggable: false,
    connectable: false,
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  }));
  const edges: Edge[] = model.edges.map((edge) => ({
    id: `${edge.parentId}->${edge.childId}`,
    source: edge.parentId,
    target: edge.childId,
    className: edge.isOnActiveStack ? "edge-active-stack" : "edge-default",
  }));
  return { nodes, edges };
}
