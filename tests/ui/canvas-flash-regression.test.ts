import { describe, expect, it } from "vitest";
import {
  layoutOnlyNodeChanges,
  selectionNodeChanges,
} from "../../src/ui/tree/layout-node-changes.js";

describe("canvas flash regression helpers", () => {
  it("keeps select changes out of layout remaps so selection does not rebuild the tree", () => {
    const changes = [
      { type: "position", id: "n1" },
      { type: "select", id: "n1", selected: true },
      { type: "dimensions", id: "n1" },
      { type: "remove", id: "n2" },
    ];
    expect(layoutOnlyNodeChanges(changes).map((change) => change.type)).toEqual([
      "position",
      "dimensions",
    ]);
    expect(selectionNodeChanges(changes).map((change) => change.type)).toEqual([
      "select",
    ]);
  });
});
