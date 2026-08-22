import { describe, expect, it } from "vitest";
import {
  activateNode,
  closeNode,
  parkNode,
  setNodeSummary,
  updateProjectMetadata,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("flat core-question hierarchy (no Project Root)", () => {
  it("activates a Core Question onto [Q1]", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const [q1, q2] = coreQuestionIds(started);
    if (!q1 || !q2) {
      throw new Error("missing core questions");
    }

    const snapshot = unwrap(activateNode(started, { nodeId: q1 }));

    expect(snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(snapshot.pass.rootNodeIds).toEqual([q1, q2]);
    expect(snapshot.pass.activeStack).toEqual([q1]);
    expect(snapshot.nodes[q1]?.lifecycle).toBe("active");
    expect(snapshot.nodes[q2]?.lifecycle).toBe("open");
    assertActiveBijection(snapshot);
  });

  it("switches Q1 → Q2 as sole active stack members", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const q2 = coreQuestionIds(onQ1)[1];
    if (!q2) {
      throw new Error("missing Q2");
    }

    const switched = unwrap(activateNode(onQ1, { nodeId: q2 }));

    expect(switched.pass.activeStack).toEqual([q2]);
    expect(switched.nodes[q1]?.lifecycle).toBe("open");
    expect(switched.nodes[q2]?.lifecycle).toBe("active");
    assertActiveBijection(switched);
  });

  it("parks Q1 clearing the active stack", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );

    const parkedQ1 = unwrap(parkNode(onQ1, { nodeId: q1 }));
    expect(parkedQ1.nodes[q1]?.lifecycle).toBe("parked");
    expect(parkedQ1.pass.activeStack).toEqual([]);
    assertActiveBijection(parkedQ1);
  });

  it("closes prepared Q1 and allows sibling Q2 to remain open", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const q2 = coreQuestionIds(onQ1)[1];
    if (!q2) {
      throw new Error("missing Q2");
    }

    const closed = closePrepared(onQ1, q1, ports);
    expect(closed.nodes[q1]?.lifecycle).toBe("closed");
    expect(closed.nodes[q2]?.lifecycle).toBe("open");
    expect(closed.pass.activeStack).toEqual([]);
  });

  it("updateProjectMetadata does not create or sync a Project Root node", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1"]);
    const q1 = coreQuestionIds(started)[0]!;
    const updated = unwrap(
      updateProjectMetadata(started, {
        name: "Renamed",
        source: "https://github.com/acme/renamed",
      }),
    );
    expect(updated.project.name).toBe("Renamed");
    expect(updated.pass.projectRootNodeId).toBeUndefined();
    expect(updated.pass.rootNodeIds).toEqual([q1]);
    expect(updated.nodes[q1]?.question).toBe("Q1");
  });
});
