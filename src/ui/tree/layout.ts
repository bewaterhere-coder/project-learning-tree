import type { NodeId, TreeViewModel } from "../../application/index.js";

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 148;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 72;
const ROOT_GAP = 64;

export interface NodePosition {
  x: number;
  y: number;
}

/** Directional tree layout presets (main axis first). */
export type LayoutDirection = "tb" | "bt" | "lr" | "rl";

export function computeLayout(
  model: TreeViewModel,
  direction: LayoutDirection = "tb",
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

  const vertical = direction === "tb" || direction === "bt";
  const mainSize = vertical ? NODE_HEIGHT : NODE_WIDTH;
  const crossSize = vertical ? NODE_WIDTH : NODE_HEIGHT;
  const mainGap = vertical ? VERTICAL_GAP : HORIZONTAL_GAP;
  const crossGap = vertical ? HORIZONTAL_GAP : VERTICAL_GAP;

  const subtreeCross = (id: NodeId): number => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      return crossSize;
    }
    const kidsCross = kids.reduce(
      (sum, childId) => sum + subtreeCross(childId),
      0,
    );
    return Math.max(crossSize, kidsCross + crossGap * (kids.length - 1));
  };

  const positions: Record<NodeId, NodePosition> = {};

  const place = (id: NodeId, crossStart: number, mainStart: number): void => {
    const extent = subtreeCross(id);
    const crossPos = crossStart + (extent - crossSize) / 2;
    positions[id] = vertical
      ? { x: crossPos, y: mainStart }
      : { x: mainStart, y: crossPos };
    let childCross = crossStart;
    for (const childId of children.get(id) ?? []) {
      const childExtent = subtreeCross(childId);
      place(childId, childCross, mainStart + mainSize + mainGap);
      childCross += childExtent + crossGap;
    }
  };

  let rootCross = 0;
  for (const rootId of model.rootNodeIds) {
    const extent = subtreeCross(rootId);
    place(rootId, rootCross, 0);
    rootCross += extent + ROOT_GAP;
  }

  if (direction === "bt" || direction === "rl") {
    let maxMain = 0;
    for (const position of Object.values(positions)) {
      const main = vertical ? position.y : position.x;
      if (main > maxMain) {
        maxMain = main;
      }
    }
    for (const position of Object.values(positions)) {
      if (vertical) {
        position.y = maxMain - position.y;
      } else {
        position.x = maxMain - position.x;
      }
    }
  }

  return positions;
}
