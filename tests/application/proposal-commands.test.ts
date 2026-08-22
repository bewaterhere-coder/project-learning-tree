import { describe, expect, it } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import { createDemoTreeFixture, sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

describe("proposal-related commands", () => {
  it("createBlockingChild still requires an active parent", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const rejected = dispatchCommand(createSession(snapshot), {
      type: "createBlockingChild",
      parentId: ids.q2,
      question: "Should fail",
      goal: "Because Q2 is not active",
    });
    expect(rejected.lastError?.kind).toBe("InvalidLifecycleTransition");
    expect(rejected.snapshot).toBe(snapshot);
  });

  it("moveCandidateToFrontier appends a Frontier item through Application", () => {
    const ports = sequentialFixturePorts(9000);
    const { snapshot, ids } = createDemoTreeFixture(ports);
    const moved = dispatchCommand(
      createSession(snapshot),
      {
        type: "moveCandidateToFrontier",
        sourceNodeId: ids.q1,
        question: "Later branch",
      },
      ports,
    );
    expect(moved.lastError).toBeUndefined();
    expect(moved.snapshot.pass.frontier.some((item) => item.question === "Later branch")).toBe(
      true,
    );
  });

  it("addEvidence, addCriterion, and setNodeSummary go through Domain", () => {
    const ports = sequentialFixturePorts(9100);
    const { snapshot, ids } = createDemoTreeFixture(ports);
    const withEvidence = dispatchCommand(
      createSession(snapshot),
      {
        type: "addEvidence",
        nodeId: ids.q1,
        evidenceType: "note",
        reference: "spec §1",
      },
      ports,
    );
    expect(withEvidence.snapshot.nodes[ids.q1]?.evidence.some((item) => item.reference === "spec §1")).toBe(
      true,
    );
    const withCriterion = dispatchCommand(
      withEvidence,
      {
        type: "addCriterion",
        nodeId: ids.q1,
        description: "Explain the DAG",
        required: true,
        evidenceRequired: false,
      },
      ports,
    );
    expect(
      withCriterion.snapshot.nodes[ids.q1]?.definitionOfDone.some(
        (item) => item.description === "Explain the DAG",
      ),
    ).toBe(true);
    const withSummary = dispatchCommand(
      withCriterion,
      {
        type: "setNodeSummary",
        nodeId: ids.q1,
        summary: "Q1 learning summary",
      },
      ports,
    );
    expect(withSummary.snapshot.nodes[ids.q1]?.summary).toBe("Q1 learning summary");
  });
});
