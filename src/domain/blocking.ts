import { requireNode } from "./snapshot.js";
import type { DomainSnapshot, NodeId } from "./types.js";

export function unresolvedBlockingChildIds(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): NodeId[] {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return [];
  }
  return node.blockingChildIds.filter((childId) => {
    const child = snapshot.nodes[childId];
    return child !== undefined && child.lifecycle !== "closed";
  });
}

export function isBlocked(snapshot: DomainSnapshot, nodeId: NodeId): boolean {
  const found = requireNode(snapshot, nodeId);
  if (!found.ok) {
    return false;
  }
  return unresolvedBlockingChildIds(snapshot, nodeId).length > 0;
}
