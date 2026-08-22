import type { NodeId } from "../application/index.js";
import type { NodePosition } from "./types.js";

export function resolveNodePosition(
  nodeId: NodeId,
  saved: Record<NodeId, NodePosition>,
  auto: Record<NodeId, NodePosition>,
): NodePosition {
  return saved[nodeId] ?? auto[nodeId] ?? { x: 0, y: 0 };
}

export function mergeNodePositions(
  nodeIds: NodeId[],
  saved: Record<NodeId, NodePosition>,
  auto: Record<NodeId, NodePosition>,
): Record<NodeId, NodePosition> {
  const next: Record<NodeId, NodePosition> = {};
  for (const nodeId of nodeIds) {
    next[nodeId] = resolveNodePosition(nodeId, saved, auto);
  }
  return next;
}
