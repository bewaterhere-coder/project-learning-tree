import { describe, expect, it } from "vitest";
import {
  createSession,
  dispatchCommand,
  selectCloseReadiness,
} from "../../src/application/index.js";
import { setNodeSummary } from "../../src/domain/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";

function prepareActiveChild(options?: {
  includeSummary?: boolean;
  includeEvidence?: boolean;
  evidenceRequired?: boolean;
}) {
  const ports = sequentialFixturePorts();
  const branch = createBlockedBranchFixture(ports);
  const activated = dispatchCommand(createSession(branch.snapshot), {
    type: "activateNode",
    nodeId: branch.ids.childA,
  });
  const snapshot = createClosableNodeFixture(
    activated.snapshot,
    branch.ids.childA,
    ports,
    {
      includeSummary: options?.includeSummary,
      includeEvidence: options?.includeEvidence,
      evidenceRequired: options?.evidenceRequired,
    },
  );
  return { snapshot, ids: branch.ids, ports };
}

describe("selectCloseReadiness", () => {
  it("shows a missing summary before close is attempted", () => {
    const { snapshot, ids } = prepareActiveChild({ includeSummary: false });
    const readiness = selectCloseReadiness(snapshot, ids.childA);
    expect(readiness.allowed).toBe(false);
    expect(
      readiness.requirements.find((requirement) => requirement.kind === "summary"),
    ).toEqual({ kind: "summary", met: false });
  });

  it("removes the summary requirement after setNodeSummary", () => {
    const { snapshot, ids } = prepareActiveChild({ includeSummary: false });
    const added = setNodeSummary(snapshot, {
      nodeId: ids.childA,
      summary: "Child A is understood.",
    });
    if (!added.ok) {
      throw new Error(added.error.kind);
    }
    const readiness = selectCloseReadiness(added.snapshot, ids.childA);
    expect(
      readiness.requirements.find((requirement) => requirement.kind === "summary")
        ?.met,
    ).toBe(true);
    expect(readiness.allowed).toBe(true);
  });

  it("shows missing required evidence before close is attempted", () => {
    const { snapshot, ids } = prepareActiveChild({
      includeEvidence: false,
      evidenceRequired: true,
    });
    const readiness = selectCloseReadiness(snapshot, ids.childA);
    expect(readiness.allowed).toBe(false);
    const evidence = readiness.requirements.find(
      (requirement) => requirement.kind === "evidence",
    );
    expect(evidence?.met).toBe(false);
  });

  it("shows unresolved blocking children before close is attempted", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const readiness = selectCloseReadiness(snapshot, ids.parent);
    expect(readiness.allowed).toBe(false);
    const blocking = readiness.requirements.find(
      (requirement) => requirement.kind === "blockingChildren",
    );
    expect(blocking?.met).toBe(false);
    if (blocking?.kind !== "blockingChildren") {
      throw new Error("expected blocking children requirement");
    }
    expect(blocking.count).toBe(2);
    expect(blocking.questions).toEqual(["Child A", "Child B"]);
  });

  it("allows complete when Domain convergence passes on an active node", () => {
    const { snapshot, ids } = prepareActiveChild();
    const readiness = selectCloseReadiness(snapshot, ids.childA);
    expect(readiness.allowed).toBe(true);
    expect(readiness.requirements.every((requirement) => requirement.met)).toBe(
      true,
    );
  });

  it("still lets closeNode reject an unready node and preserve snapshot identity", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const session = createSession(snapshot);
    const next = dispatchCommand(session, {
      type: "closeNode",
      nodeId: ids.parent,
    });
    expect(selectCloseReadiness(snapshot, ids.parent).allowed).toBe(false);
    expect(next.snapshot).toBe(session.snapshot);
    expect(next.lastError?.kind).toBe("UnresolvedBlockingChildren");
    expect(next.lastErrorCommand).toBe("closeNode");
  });
});
