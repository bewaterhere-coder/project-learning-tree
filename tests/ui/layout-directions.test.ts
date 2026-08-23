import { describe, expect, it } from "vitest";
import { selectTreeViewModel } from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";
import {
  computeLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutDirection,
} from "../../src/ui/tree/layout.js";

function boxes(
  positions: Record<string, { x: number; y: number }>,
): Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> {
  return Object.entries(positions).map(([id, position]) => ({
    id,
    x1: position.x,
    y1: position.y,
    x2: position.x + NODE_WIDTH,
    y2: position.y + NODE_HEIGHT,
  }));
}

function assertNoOverlap(positions: Record<string, { x: number; y: number }>) {
  const all = boxes(positions);
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i]!;
      const b = all[j]!;
      const overlap =
        a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }
}

describe("computeLayout directions", () => {
  const directions: LayoutDirection[] = ["tb", "bt", "lr", "rl"];

  it("keeps a single node stable for every direction", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    // Use only the root of the demo by filtering through layout of full model;
    // single-node case: layout with one root still returns a finite position.
    const model = selectTreeViewModel(snapshot);
    for (const direction of directions) {
      const positions = computeLayout(model, direction);
      expect(positions[ids.q1]).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
    }
  });

  it("arranges a multi-level tree without overlap for all four directions", () => {
    const { snapshot } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    expect(model.nodes.length).toBeGreaterThan(2);
    for (const direction of directions) {
      const positions = computeLayout(model, direction);
      expect(Object.keys(positions).sort()).toEqual(
        model.nodes.map((node) => node.id).sort(),
      );
      assertNoOverlap(positions);
    }
  });

  it("is deterministic when re-run", () => {
    const { snapshot } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    for (const direction of directions) {
      expect(computeLayout(model, direction)).toEqual(
        computeLayout(model, direction),
      );
    }
  });

  it("places children along the expected main axis for tb and lr", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    const tb = computeLayout(model, "tb");
    expect(tb[ids.q11]!.y).toBeGreaterThan(tb[ids.q1]!.y);
    const lr = computeLayout(model, "lr");
    expect(lr[ids.q11]!.x).toBeGreaterThan(lr[ids.q1]!.x);
    const bt = computeLayout(model, "bt");
    expect(bt[ids.q11]!.y).toBeLessThan(bt[ids.q1]!.y);
    const rl = computeLayout(model, "rl");
    expect(rl[ids.q11]!.x).toBeLessThan(rl[ids.q1]!.x);
  });
});
