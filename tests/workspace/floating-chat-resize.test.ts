import { describe, expect, it } from "vitest";
import {
  FLOATING_CHAT_VIEWPORT_MARGIN,
  MIN_CHAT_HEIGHT,
  MIN_CHAT_WIDTH,
  resolveFloatingChatResize,
} from "../../src/workspace/index.js";

const margin = FLOATING_CHAT_VIEWPORT_MARGIN;

function assertInsideViewport(
  rect: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
) {
  expect(rect.x).toBeGreaterThanOrEqual(margin);
  expect(rect.y).toBeGreaterThanOrEqual(margin);
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width - margin);
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height - margin);
  expect(rect.width).toBeGreaterThanOrEqual(MIN_CHAT_WIDTH);
  expect(rect.height).toBeGreaterThanOrEqual(MIN_CHAT_HEIGHT);
}

describe("resolveFloatingChatResize viewport bounds", () => {
  it("clamps west resize so x stays inside the usable viewport (acceptance regression)", () => {
    // Acceptance example: x=24, width=360 grown west toward width=860 must not yield x=-476.
    const viewport = { width: 1200, height: 800 };
    const originX = 24;
    const startWidth = 360;
    const stableRight = originX + startWidth;
    const result = resolveFloatingChatResize({
      handle: "w",
      originX,
      originY: 40,
      startWidth,
      startHeight: 480,
      dx: -(860 - startWidth),
      dy: 0,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });

    assertInsideViewport(result, viewport);
    expect(result.x).toBe(margin);
    expect(result.x).toBeGreaterThanOrEqual(0);
    // Opposite (east) edge stays stable when room allows.
    expect(result.x + result.width).toBe(stableRight);
  });

  it("clamps north resize so y stays inside the usable viewport", () => {
    const viewport = { width: 1200, height: 800 };
    const originY = 24;
    const startHeight = 480;
    const stableBottom = originY + startHeight;
    const result = resolveFloatingChatResize({
      handle: "n",
      originX: 80,
      originY,
      startWidth: 360,
      startHeight,
      dx: 0,
      dy: -(700 - startHeight),
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });

    assertInsideViewport(result, viewport);
    expect(result.y).toBe(margin);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y + result.height).toBe(stableBottom);
  });

  it("clamps northwest corner resize against both left and top margins", () => {
    const viewport = { width: 1000, height: 700 };
    const originX = 24;
    const originY = 24;
    const startWidth = 360;
    const startHeight = 400;
    const stableRight = originX + startWidth;
    const stableBottom = originY + startHeight;
    const result = resolveFloatingChatResize({
      handle: "nw",
      originX,
      originY,
      startWidth,
      startHeight,
      dx: -500,
      dy: -500,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });

    assertInsideViewport(result, viewport);
    expect(result.x).toBe(margin);
    expect(result.y).toBe(margin);
    expect(result.x + result.width).toBe(stableRight);
    expect(result.y + result.height).toBe(stableBottom);
  });

  it("keeps east/south growth from overflowing the opposite viewport edge", () => {
    const viewport = { width: 900, height: 600 };
    const result = resolveFloatingChatResize({
      handle: "se",
      originX: 500,
      originY: 300,
      startWidth: 360,
      startHeight: 280,
      dx: 400,
      dy: 400,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });

    assertInsideViewport(result, viewport);
    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
    expect(result.x + result.width).toBe(viewport.width - margin);
    expect(result.y + result.height).toBe(viewport.height - margin);
  });
});
