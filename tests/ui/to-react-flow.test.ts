import { describe, expect, it } from "vitest";
import { selectTreeViewModel } from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";
import { SOURCE_HANDLES, TARGET_HANDLES } from "../../src/ui/tree/edge-routing.js";
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

  it("classifies stack, blocking, and receded edges without a domain edge type", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const { edges } = toReactFlow(selectTreeViewModel(snapshot));
    const closed = edges.find((edge) => edge.id === `${ids.q1}->${ids.q11}`);
    const parked = edges.find((edge) => edge.id === `${ids.q1}->${ids.q12}`);
    expect(closed?.className).toContain("edge-quiet");
    expect(closed?.className).toContain("edge-blocking");
    expect(closed?.markerEnd).toBe("url(#blocking-tick)");
    expect(parked?.className).toContain("edge-quiet");
    expect(parked?.className).toContain("edge-blocking");
  });

  it("derives default top-down handles for the auto layout tree", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const { edges } = toReactFlow(selectTreeViewModel(snapshot));
    const parentChild = edges.find((edge) => edge.id === `${ids.q1}->${ids.q11}`);
    expect(parentChild?.sourceHandle).toBe(SOURCE_HANDLES.bottom);
    expect(parentChild?.targetHandle).toBe(TARGET_HANDLES.top);
  });

  it("re-derives handles when a child is relocated beside its parent", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    const auto = computeLayout(model);
    const saved = {
      [ids.q11]: { x: auto[ids.q1]!.x + 400, y: auto[ids.q1]!.y },
    };
    const { edges } = toReactFlow(model, saved);
    const relocated = edges.find((edge) => edge.id === `${ids.q1}->${ids.q11}`);
    expect(relocated?.sourceHandle).toBe(SOURCE_HANDLES.right);
    expect(relocated?.targetHandle).toBe(TARGET_HANDLES.left);
  });

  it("renders multiple outgoing edges for one parent", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const { edges } = toReactFlow(selectTreeViewModel(snapshot));
    const outgoing = edges.filter((edge) => edge.source === ids.q1);
    expect(outgoing).toHaveLength(2);
    expect(outgoing.map((edge) => edge.target).sort()).toEqual(
      [ids.q11, ids.q12].sort(),
    );
  });

  it("does not persist handles in the domain snapshot", () => {
    const { snapshot } = createDemoTreeFixture();
    expect(JSON.stringify(snapshot)).not.toContain("sourceHandle");
    expect(JSON.stringify(snapshot)).not.toContain("targetHandle");
  });
});
