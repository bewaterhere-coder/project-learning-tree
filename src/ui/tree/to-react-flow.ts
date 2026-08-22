import type { Edge, Node } from "@xyflow/react";
import type { NodeId, TreeNodeView, TreeViewModel } from "../../application/index.js";
import {
  resolveNodePosition,
  type NodePosition,
} from "../../workspace/index.js";
import { deriveEdgeHandles, flowNodeCenter } from "./edge-routing.js";
import { computeLayout, NODE_HEIGHT, NODE_WIDTH } from "./layout.js";

type LearningNodeData = TreeNodeView & {
  isRecommended?: boolean;
  onOpenChatForNode?: (nodeId: NodeId) => void;
} & Record<string, unknown>;
export type LearningFlowNode = Node<LearningNodeData, "learningNode">;

export function toReactFlow(
  model: TreeViewModel,
  savedPositions: Record<NodeId, NodePosition> = {},
  recommendedNodeIds: readonly NodeId[] = [],
): {
  nodes: LearningFlowNode[];
  edges: Edge[];
} {
  const autoPositions = computeLayout(model);
  const recommended = new Set(recommendedNodeIds);
  const nodes: LearningFlowNode[] = model.nodes.map((node) => ({
    id: node.id,
    type: "learningNode",
    position: resolveNodePosition(node.id, savedPositions, autoPositions),
    data: { ...node, isRecommended: recommended.has(node.id) },
    selected: node.isCurrentFocus,
    draggable: true,
    connectable: false,
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: Edge[] = model.edges.map((edge) => {
    const pathClass = edge.isOnActiveStack
      ? "edge-active-stack"
      : edge.isReceded
        ? "edge-quiet"
        : "edge-default";
    const source = nodeById.get(edge.parentId);
    const target = nodeById.get(edge.childId);
    const handles =
      source !== undefined && target !== undefined
        ? deriveEdgeHandles(flowNodeCenter(source), flowNodeCenter(target))
        : deriveEdgeHandles(
            { x: 0, y: 0 },
            { x: 0, y: NODE_HEIGHT + 72 },
          );
    return {
      id: `${edge.parentId}->${edge.childId}`,
      source: edge.parentId,
      target: edge.childId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      className: [pathClass, edge.isBlocking ? "edge-blocking" : ""]
        .filter(Boolean)
        .join(" "),
      markerEnd: edge.isBlocking ? "url(#blocking-tick)" : undefined,
    };
  });
  return { nodes, edges };
}

export function routeEdgesForNodes(
  edges: Edge[],
  nodes: readonly LearningFlowNode[],
): Edge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source === undefined || target === undefined) {
      return edge;
    }
    const handles = deriveEdgeHandles(
      flowNodeCenter(source),
      flowNodeCenter(target),
    );
    return {
      ...edge,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });
}
