import type { NodeId, TreeViewModel } from "../../application/index.js";

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 92;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 72;
const ROOT_GAP = 64;

export interface NodePosition {
  x: number;
  y: number;
}

export function computeLayout(
  model: TreeViewModel,
): Record<NodeId, NodePosition> {
  const children = new Map<NodeId, NodeId[]>();
  for (const node of model.nodes) {
    if (!children.has(node.id)) {
      children.set(node.id, []);
    }
  }
  for (const edge of model.edges) {
    const list = children.get(edge.parentId) ?? [];
    list.push(edge.childId);
    children.set(edge.parentId, list);
  }

  const subtreeWidth = (id: NodeId): number => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      return NODE_WIDTH;
    }
    const kidsWidth = kids.reduce(
      (sum, childId) => sum + subtreeWidth(childId),
      0,
    );
    return Math.max(NODE_WIDTH, kidsWidth + HORIZONTAL_GAP * (kids.length - 1));
  };

  const positions: Record<NodeId, NodePosition> = {};

  const place = (id: NodeId, left: number, top: number): void => {
    const width = subtreeWidth(id);
    positions[id] = {
      x: left + (width - NODE_WIDTH) / 2,
      y: top,
    };
    let childLeft = left;
    for (const childId of children.get(id) ?? []) {
      const childWidth = subtreeWidth(childId);
      place(childId, childLeft, top + NODE_HEIGHT + VERTICAL_GAP);
      childLeft += childWidth + HORIZONTAL_GAP;
    }
  };

  let rootLeft = 0;
  for (const rootId of model.rootNodeIds) {
    const width = subtreeWidth(rootId);
    place(rootId, rootLeft, 0);
    rootLeft += width + ROOT_GAP;
  }

  return positions;
}
