import { describe, expect, it } from "vitest";
import { selectTreeViewModel } from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";
import { computeLayout } from "../../src/ui/tree/layout.js";
import { toReactFlow } from "../../src/ui/tree/to-react-flow.js";

describe("toReactFlow position priority", () => {
  it("prefers a saved user position over auto layout", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    const auto = computeLayout(model);
    const saved = { [ids.q1]: { x: 900, y: 40 } };
    const { nodes } = toReactFlow(model, saved);
    const placed = nodes.find((node) => node.id === ids.q1);
    expect(placed?.position).toEqual({ x: 900, y: 40 });
    expect(auto[ids.q1]).not.toEqual({ x: 900, y: 40 });
    expect(placed?.draggable).toBe(true);
    expect(placed?.connectable).toBe(false);
  });
});
