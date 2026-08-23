import { describe, expect, it } from "vitest";
import { layoutOnlyNodeChanges } from "../../src/ui/tree/layout-node-changes.js";

describe("layoutOnlyNodeChanges", () => {
  it("keeps position and dimension changes, omits select, and drops structural edits", () => {
    const kept = layoutOnlyNodeChanges([
      { type: "position", id: "a", position: { x: 10, y: 20 } },
      { type: "select", id: "a", selected: true },
      { type: "dimensions", id: "a", dimensions: { width: 260, height: 92 } },
      { type: "remove", id: "a" },
      { type: "add", item: { id: "b" } },
      { type: "replace", id: "a", item: { id: "a" } },
    ]);

    expect(kept.map((change) => change.type)).toEqual([
      "position",
      "dimensions",
    ]);
  });
});
