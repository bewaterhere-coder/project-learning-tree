import { describe, expect, it } from "vitest";
import {
  createSession,
  dispatchCommand,
  selectCloseReadiness,
} from "../../src/application/index.js";
import {
  addCriterion,
  evaluateConvergence,
  setNodeSummary,
} from "../../src/domain/index.js";
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

  it("includes required criteria and evidence as requirements, omitting optional criteria", () => {
    const { snapshot, ids, ports } = prepareActiveChild();
    const optional = addCriterion(
      snapshot,
      {
        nodeId: ids.childA,
        description: "Nice to have",
        required: false,
        evidenceRequired: false,
      },
      ports,
    );
    if (!optional.ok) {
      throw new Error(optional.error.kind);
    }
    const readiness = selectCloseReadiness(optional.snapshot, ids.childA);
    const criteria = readiness.requirements.filter(
      (requirement) => requirement.kind === "criterion",
    );
    const evidence = readiness.requirements.filter(
      (requirement) => requirement.kind === "evidence",
    );
    expect(criteria).toHaveLength(1);
    expect(criteria[0]?.description).toBe("Understood at the target depth");
    expect(criteria[0]?.met).toBe(true);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.met).toBe(true);
    expect(
      readiness.requirements.some(
        (requirement) =>
          requirement.kind === "criterion" &&
          requirement.description === "Nice to have",
      ),
    ).toBe(false);
  });

  it("allows complete when convergence passes even if the node is not active", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const closable = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childB,
      ports,
    );
    expect(closable.nodes[branch.ids.childB]?.lifecycle).toBe("open");
    const evaluation = evaluateConvergence(closable, {
      nodeId: branch.ids.childB,
    });
    expect(evaluation.ok && evaluation.evaluation.canClose).toBe(true);
    expect(selectCloseReadiness(closable, branch.ids.childB).allowed).toBe(true);
  });

  it("includes met requirements when only summary is missing", () => {
    const { snapshot, ids } = prepareActiveChild({ includeSummary: false });
    const readiness = selectCloseReadiness(snapshot, ids.childA);
    expect(
      readiness.requirements.find((requirement) => requirement.kind === "criterion")
        ?.met,
    ).toBe(true);
    expect(
      readiness.requirements.find((requirement) => requirement.kind === "evidence")
        ?.met,
    ).toBe(true);
    expect(
      readiness.requirements.find((requirement) => requirement.kind === "summary")
        ?.met,
    ).toBe(false);
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
