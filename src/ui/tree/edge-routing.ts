import { NODE_HEIGHT, NODE_WIDTH } from "./layout.js";

export interface Point {
  x: number;
  y: number;
}

export const SOURCE_HANDLES = {
  top: "s-top",
  right: "s-right",
  bottom: "s-bottom",
  left: "s-left",
} as const;

export const TARGET_HANDLES = {
  top: "t-top",
  right: "t-right",
  bottom: "t-bottom",
  left: "t-left",
} as const;

export interface EdgeHandles {
  sourceHandle: string;
  targetHandle: string;
}

export function nodeCenter(
  position: Point,
  width = NODE_WIDTH,
  height = NODE_HEIGHT,
): Point {
  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
}

export function flowNodeCenter(node: {
  position: Point;
  width?: number;
  height?: number;
  style?: { width?: number | string; height?: number | string };
}): Point {
  const styleWidth = node.style?.width;
  const styleHeight = node.style?.height;
  const width =
    node.width ??
    (typeof styleWidth === "number" ? styleWidth : NODE_WIDTH);
  const height =
    node.height ??
    (typeof styleHeight === "number" ? styleHeight : NODE_HEIGHT);
  return nodeCenter(node.position, width, height);
}

export function deriveEdgeHandles(
  sourceCenter: Point,
  targetCenter: Point,
): EdgeHandles {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return {
        sourceHandle: SOURCE_HANDLES.right,
        targetHandle: TARGET_HANDLES.left,
      };
    }
    return {
      sourceHandle: SOURCE_HANDLES.left,
      targetHandle: TARGET_HANDLES.right,
    };
  }
  if (dy > 0) {
    return {
      sourceHandle: SOURCE_HANDLES.bottom,
      targetHandle: TARGET_HANDLES.top,
    };
  }
  return {
    sourceHandle: SOURCE_HANDLES.top,
    targetHandle: TARGET_HANDLES.bottom,
  };
}
