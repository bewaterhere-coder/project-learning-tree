import { NODE_HEIGHT, NODE_WIDTH } from "./layout.js";

export interface BoxSize {
  width: number;
  height: number;
}

export interface PositionedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeLikeForSize {
  id: string;
  width?: number | null;
  height?: number | null;
  measured?: { width?: number; height?: number };
  style?: { width?: number | string; height?: number | string };
}

function readStyleSize(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

/** Prefer XYFlow measured/rendered size; fall back to style, then fixed layout constants. */
export function resolveNodeBoxSize(node: NodeLikeForSize): BoxSize {
  const measuredW = node.measured?.width;
  const measuredH = node.measured?.height;
  if (
    typeof measuredW === "number" &&
    measuredW > 0 &&
    typeof measuredH === "number" &&
    measuredH > 0
  ) {
    return { width: measuredW, height: measuredH };
  }
  if (
    typeof node.width === "number" &&
    node.width > 0 &&
    typeof node.height === "number" &&
    node.height > 0
  ) {
    return { width: node.width, height: node.height };
  }
  const styleW = readStyleSize(node.style?.width);
  const styleH = readStyleSize(node.style?.height);
  if (styleW !== undefined && styleH !== undefined) {
    return { width: styleW, height: styleH };
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

export function boxesOverlap(a: PositionedBox, b: PositionedBox): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function overlapsAny(candidate: PositionedBox, peers: readonly PositionedBox[]): boolean {
  return peers.some((peer) => boxesOverlap(candidate, peer));
}

/**
 * If the dragged box overlaps peers, return the nearest non-overlapping position
 * found by an expanding spiral search. Otherwise return the drop position.
 */
export function resolveDragCollision(
  dragged: PositionedBox,
  peers: readonly PositionedBox[],
  options?: { step?: number; maxRadius?: number },
): { x: number; y: number; corrected: boolean } {
  const others = peers.filter((peer) => peer.id !== dragged.id);
  if (!overlapsAny(dragged, others)) {
    return { x: dragged.x, y: dragged.y, corrected: false };
  }

  const step = options?.step ?? 8;
  const maxRadius = options?.maxRadius ?? Math.max(NODE_WIDTH, NODE_HEIGHT) * 4;
  let best: { x: number; y: number; distance: number } | undefined;

  for (let radius = step; radius <= maxRadius; radius += step) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = dragged.x + Math.cos(angle) * radius;
      const y = dragged.y + Math.sin(angle) * radius;
      const candidate: PositionedBox = {
        ...dragged,
        x,
        y,
      };
      if (overlapsAny(candidate, others)) {
        continue;
      }
      const distance = Math.hypot(x - dragged.x, y - dragged.y);
      if (best === undefined || distance < best.distance) {
        best = { x, y, distance };
      }
    }
    if (best !== undefined) {
      return { x: best.x, y: best.y, corrected: true };
    }
  }

  // Fallback: nudge right until clear or give up after many steps.
  for (let i = 1; i <= 64; i += 1) {
    const x = dragged.x + step * i;
    const candidate = { ...dragged, x };
    if (!overlapsAny(candidate, others)) {
      return { x, y: dragged.y, corrected: true };
    }
  }

  return { x: dragged.x, y: dragged.y, corrected: false };
}
