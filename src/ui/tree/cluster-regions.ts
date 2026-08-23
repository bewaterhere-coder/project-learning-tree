import type { NodeId, TreeViewModel } from "../../application/index.js";
import { NODE_HEIGHT, NODE_WIDTH, type NodePosition } from "./layout.js";

export const CLUSTER_PADDING = 28;
export const CLUSTER_TITLE_RESERVE = 22;
export const CLUSTER_TONE_COUNT = 5;

export interface ClusterRegion {
  id: string;
  rootId: NodeId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  toneIndex: number;
}

export function clusterNodeId(rootId: NodeId): string {
  return `cluster:${rootId}`;
}

export function isClusterNodeId(id: string): boolean {
  return id.startsWith("cluster:");
}

function subtreeNodeIds(
  rootId: NodeId,
  model: TreeViewModel,
): NodeId[] {
  const children = new Map<NodeId, NodeId[]>();
  for (const edge of model.edges) {
    const list = children.get(edge.parentId) ?? [];
    list.push(edge.childId);
    children.set(edge.parentId, list);
  }
  const ids: NodeId[] = [];
  const stack: NodeId[] = [rootId];
  const seen = new Set<NodeId>();
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
    for (const childId of children.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return ids;
}

export function computeClusterRegions(
  model: TreeViewModel,
  positions: Record<NodeId, NodePosition>,
  nodeWidth = NODE_WIDTH,
  nodeHeight = NODE_HEIGHT,
): ClusterRegion[] {
  const regions: ClusterRegion[] = [];
  const projectRoot = model.nodes.find((node) => node.isProjectRoot);
  const clusterRootIds =
    projectRoot !== undefined
      ? model.nodes
          .filter((node) => node.parentId === projectRoot.id)
          .map((node) => node.id)
      : [...model.rootNodeIds];
  clusterRootIds.forEach((rootId, index) => {
    const memberIds = subtreeNodeIds(rootId, model);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let counted = 0;
    for (const id of memberIds) {
      const position = positions[id];
      if (position === undefined) {
        continue;
      }
      counted += 1;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + nodeWidth);
      maxY = Math.max(maxY, position.y + nodeHeight);
    }
    if (counted === 0) {
      return;
    }
    const root = model.nodes.find((node) => node.id === rootId);
    regions.push({
      id: clusterNodeId(rootId),
      rootId,
      title: root?.question ?? rootId,
      x: minX - CLUSTER_PADDING,
      y: minY - CLUSTER_PADDING - CLUSTER_TITLE_RESERVE,
      width: maxX - minX + CLUSTER_PADDING * 2,
      height: maxY - minY + CLUSTER_PADDING * 2 + CLUSTER_TITLE_RESERVE,
      toneIndex: index % CLUSTER_TONE_COUNT,
    });
  });
  return regions;
}
