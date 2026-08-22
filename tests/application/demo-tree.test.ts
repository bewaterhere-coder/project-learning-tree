import { describe, expect, it } from "vitest";
import { isBlocked } from "../../src/domain/index.js";
import {
  createBlockedBranchFixture,
  createDemoTreeFixture,
} from "../../src/fixtures/demo-tree.js";

describe("fixture builders", () => {
  it("builds the demo tree with the four visual states via Domain operations", () => {
    const { snapshot, ids } = createDemoTreeFixture();

    expect(snapshot.nodes[ids.q1]?.lifecycle).toBe("active");
    expect(isBlocked(snapshot, ids.q1)).toBe(true);
    expect(snapshot.nodes[ids.q11]?.lifecycle).toBe("closed");
    expect(snapshot.nodes[ids.q12]?.lifecycle).toBe("parked");
    expect(snapshot.nodes[ids.q2]?.lifecycle).toBe("open");
    expect(snapshot.pass.activeStack).toEqual([ids.q1,
    ]);
    expect(snapshot.pass.currentFocusNodeId).toBe(ids.q2);
    expect(snapshot.nodes[ids.q11]?.parentId).toBe(ids.q1);
    expect(snapshot.nodes[ids.q12]?.parentId).toBe(ids.q1);
    expect(JSON.stringify(snapshot)).not.toMatch(/"lifecycle":"blocked"/);
  });

  it("builds a blocked branch without patching snapshot fields", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    expect(snapshot.nodes[ids.parent]?.lifecycle).toBe("active");
    expect(isBlocked(snapshot, ids.parent)).toBe(true);
    expect(snapshot.nodes[ids.childA]?.lifecycle).toBe("open");
    expect(snapshot.nodes[ids.childB]?.lifecycle).toBe("open");
    expect(snapshot.pass.activeStack).toEqual([ids.parent,
    ]);
  });
});
