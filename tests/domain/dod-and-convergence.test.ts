import { describe, expect, it } from "vitest";
import {
  activateBlockingChild,
  activateNode,
  addCriterion,
  addEvidence,
  closeNode,
  declareCriterionSatisfied,
  evaluateConvergence,
  focusNode,
  isBlocked,
  linkEvidenceToCriterion,
  setNodeSummary,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createActivatedChild,
  createProjectWithRoots,
  expectError,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("definition of done and convergence", () => {
  it("15. rejects closure when a required Criterion is unsatisfied", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    let snapshot = unwrap(
      addCriterion(
        active,
        {
          nodeId: rootId,
          description: "Must understand the entrypoint",
          required: true,
          evidenceRequired: false,
        },
        ports,
      ),
    );
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: rootId, summary: "draft" }));

    expectError(closeNode(snapshot, { nodeId: rootId }), "CriterionNotSatisfied");
    const evaluation = evaluateConvergence(snapshot, { nodeId: rootId });
    expect(evaluation.ok).toBe(true);
    if (evaluation.ok) {
      expect(evaluation.evaluation.canClose).toBe(false);
      expect(evaluation.evaluation.failures.some((item) => item.kind === "CriterionNotSatisfied")).toBe(true);
    }
  });

  it("16. rejects closure when an evidence-required Criterion lacks qualifying Evidence", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    let snapshot = unwrap(
      addCriterion(
        active,
        {
          nodeId: rootId,
          description: "Cite the README",
          required: true,
          evidenceRequired: true,
        },
        ports,
      ),
    );
    const criterionId = snapshot.nodes[rootId]?.definitionOfDone[0]?.id;
    if (!criterionId) {
      throw new Error("missing criterion");
    }
    snapshot = unwrap(
      declareCriterionSatisfied(snapshot, { nodeId: rootId, criterionId }),
    );
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: rootId, summary: "cited" }));

    expectError(closeNode(snapshot, { nodeId: rootId }), "MissingRequiredEvidence");
  });

  it("17. rejects closure while required Blocking Children remain unresolved", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const { snapshot } = createActivatedChild(active, rootId, "Blocker", ports);
    const prepared = unwrap(
      setNodeSummary(snapshot, { nodeId: rootId, summary: "cannot close yet" }),
    );
    expect(isBlocked(prepared, rootId)).toBe(true);
    expectError(closeNode(prepared, { nodeId: rootId }), "UnresolvedBlockingChildren");
  });

  it("18. closes a node when DoD, Evidence, blockers, and summary are satisfied", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    let snapshot = unwrap(
      addCriterion(
        active,
        {
          nodeId: rootId,
          description: "Cite the README",
          required: true,
          evidenceRequired: true,
        },
        ports,
      ),
    );
    const criterionId = snapshot.nodes[rootId]?.definitionOfDone[0]?.id;
    if (!criterionId) {
      throw new Error("missing criterion");
    }
    snapshot = unwrap(
      addEvidence(
        snapshot,
        { nodeId: rootId, type: "file", reference: "README.md" },
        ports,
      ),
    );
    const evidenceId = snapshot.nodes[rootId]?.evidence[0]?.id;
    if (!evidenceId) {
      throw new Error("missing evidence");
    }
    snapshot = unwrap(
      linkEvidenceToCriterion(snapshot, { nodeId: rootId, criterionId, evidenceId }),
    );
    snapshot = unwrap(
      declareCriterionSatisfied(snapshot, { nodeId: rootId, criterionId }),
    );
    snapshot = unwrap(
      setNodeSummary(snapshot, { nodeId: rootId, summary: "The README defines the loop." }),
    );

    const focusBefore = snapshot.pass.currentFocusNodeId;
    const closed = unwrap(closeNode(snapshot, { nodeId: rootId }));
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
    expect(closed.pass.activeStack).not.toContain(rootId);
    expect(closed.pass.currentFocusNodeId).toBe(focusBefore);
    assertActiveBijection(closed);
  });

  it("rejects linking Evidence onto the wrong Criterion or another node", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["A", "B"]);
    const [aId, bId] = coreQuestionIds(snapshot);
    if (!aId || !bId) {
      throw new Error("missing roots");
    }
    snapshot = unwrap(activateNode(snapshot, { nodeId: aId }));
    snapshot = unwrap(
      addCriterion(
        snapshot,
        { nodeId: aId, description: "A", required: true, evidenceRequired: true },
        ports,
      ),
    );
    snapshot = unwrap(
      addCriterion(
        snapshot,
        { nodeId: aId, description: "A2", required: false, evidenceRequired: false },
        ports,
      ),
    );
    const aCriterion = snapshot.nodes[aId]?.definitionOfDone[0]?.id;
    if (!aCriterion) {
      throw new Error("missing criterion");
    }
    snapshot = unwrap(
      addEvidence(
        snapshot,
        { nodeId: bId, type: "note", reference: "other-node" },
        ports,
      ),
    );
    const foreignEvidence = snapshot.nodes[bId]?.evidence[0]?.id;
    if (!foreignEvidence) {
      throw new Error("missing foreign evidence");
    }
    expectError(
      linkEvidenceToCriterion(snapshot, {
        nodeId: aId,
        criterionId: aCriterion,
        evidenceId: foreignEvidence,
      }),
      "EvidenceNotOnNode",
    );
    expectError(
      linkEvidenceToCriterion(snapshot, {
        nodeId: aId,
        criterionId: "missing-criterion",
        evidenceId: "missing-evidence",
      }),
      "EvidenceNotFound",
    );
  });

  it("does not change Current Focus when closing a leaf", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId, projectRootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const otherId = coreQuestionIds(active)[1];
    if (!otherId) {
      throw new Error("missing other");
    }
    const focused = unwrap(focusNode(active, { nodeId: otherId }));
    const closed = closePrepared(focused, rootId, ports);
    expect(closed.pass.currentFocusNodeId).toBe(otherId);
    expect(closed.pass.activeStack).toEqual([]);
    expect(closed.nodes[rootId]?.lifecycle).toBe("closed");
  });

  it("still rejects a parent close after one sibling blocker is closed", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const first = createActivatedChild(active, rootId, "C1", ports);
    const second = createActivatedChild(first.snapshot, rootId, "C2", ports);
    let snapshot = unwrap(
      activateBlockingChild(second.snapshot, {
        parentId: rootId,
        childId: first.childId,
      }),
    );
    snapshot = closePrepared(snapshot, first.childId, ports);
    snapshot = unwrap(setNodeSummary(snapshot, { nodeId: rootId, summary: "still blocked" }));
    expectError(closeNode(snapshot, { nodeId: rootId }), "UnresolvedBlockingChildren");
  });
});
