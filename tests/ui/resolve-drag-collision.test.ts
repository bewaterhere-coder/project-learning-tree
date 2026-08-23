import { describe, expect, it } from "vitest";
import { NODE_HEIGHT, NODE_WIDTH } from "../../src/ui/tree/layout.js";
import {
  boxesOverlap,
  resolveDragCollision,
  resolveNodeBoxSize,
} from "../../src/ui/tree/resolve-drag-collision.js";

describe("resolveNodeBoxSize", () => {
  it("prefers measured geometry over style and layout constants", () => {
    expect(
      resolveNodeBoxSize({
        id: "a",
        measured: { width: 300, height: 160 },
        width: 260,
        height: 148,
        style: { width: 260, height: 148 },
      }),
    ).toEqual({ width: 300, height: 160 });
  });

  it("falls back to fixed NODE_WIDTH × NODE_HEIGHT when unmeasured", () => {
    expect(resolveNodeBoxSize({ id: "a" })).toEqual({
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });
});

describe("resolveDragCollision", () => {
  const peer = {
    id: "peer",
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  };

  it("keeps a non-overlapping drop", () => {
    const dragged = {
      id: "dragged",
      x: NODE_WIDTH + 40,
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
    const result = resolveDragCollision(dragged, [peer]);
    expect(result).toEqual({ x: dragged.x, y: dragged.y, corrected: false });
  });

  it("moves only the dragged node when overlapping", () => {
    const dragged = {
      id: "dragged",
      x: 20,
      y: 10,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
    const result = resolveDragCollision(dragged, [peer]);
    expect(result.corrected).toBe(true);
    expect(
      boxesOverlap(
        { ...dragged, x: result.x, y: result.y },
        peer,
      ),
    ).toBe(false);
    expect(peer).toEqual({
      id: "peer",
      x: 0,
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  it("uses measured sizes when they differ from nominal constants", () => {
    const tallPeer = {
      id: "peer",
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    };
    const dragged = {
      id: "dragged",
      x: 40,
      y: 20,
      width: 300,
      height: 200,
    };
    const result = resolveDragCollision(dragged, [tallPeer]);
    expect(result.corrected).toBe(true);
    expect(
      boxesOverlap({ ...dragged, x: result.x, y: result.y }, tallPeer),
    ).toBe(false);
  });
});
