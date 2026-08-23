import type { DomainSnapshot, NodeId } from "./types.js";

/** True when `nodeId` is the pass Project Root (structural / progress only). */
export function isProjectRootNode(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): boolean {
  return snapshot.pass.projectRootNodeId === nodeId;
}

/** Strip Project Root from a structural root→node path for Question Active Stack. */
export function learningPathFromStructural(
  snapshot: DomainSnapshot,
  structuralPath: readonly NodeId[],
): NodeId[] {
  const rootId = snapshot.pass.projectRootNodeId;
  if (rootId === undefined) {
    return [...structuralPath];
  }
  return structuralPath.filter((id) => id !== rootId);
}
