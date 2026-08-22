import { describe, expect, it } from "vitest";
import {
  isGlobalDomainError,
  presentDomainError,
} from "../../src/application/index.js";
import { isMessageKey } from "../../src/ui/i18n/messages.js";

describe("presentDomainError", () => {
  it("maps known stack reasons without leaking English Domain reason text as the key", () => {
    const presented = presentDomainError({
      kind: "InvalidActiveStack",
      reason: "cycle in parent chain",
    });
    expect(presented.key).toBe("error.InvalidActiveStack.cycle");
    expect(isMessageKey(presented.key)).toBe(true);
  });

  it("falls back to a generic key for unknown reasons", () => {
    const presented = presentDomainError({
      kind: "InvalidActiveStack",
      reason: "stack member n1 is open, not active",
    });
    expect(presented.key).toBe("error.InvalidActiveStack");
    expect(JSON.stringify(presented.params)).not.toContain("stack member");
  });

  it("uses snapshot descriptions for criterion errors", () => {
    const presented = presentDomainError(
      {
        kind: "MissingRequiredEvidence",
        nodeId: "n1",
        criterionId: "c1",
      },
      {
        project: { id: "p", name: "P", passIds: [] },
        pass: {
          id: "pass",
          projectId: "p",
          status: "in_progress",
          rootNodeIds: ["n1"],
          activeStack: [],
          frontier: [],
        },
        nodes: {
          n1: {
            id: "n1",
            question: "Q",
            goal: "G",
            lifecycle: "active",
            targetDepth: "L1",
            definitionOfDone: [
              {
                id: "c1",
                description: "Cite the README",
                required: true,
                status: "satisfied",
                evidenceIds: [],
                evidenceRequired: true,
              },
            ],
            evidence: [],
            childIds: [],
            blockingChildIds: [],
            conversationThreadId: "t",
            reopenHistory: [],
          },
        },
      },
    );
    expect(presented.params.description).toBe("Cite the README");
  });
});

describe("isGlobalDomainError", () => {
  it("keeps close prerequisites off the global surface", () => {
    expect(
      isGlobalDomainError({ kind: "SummaryRequired", nodeId: "n1" }, "closeNode"),
    ).toBe(false);
    expect(
      isGlobalDomainError(
        {
          kind: "UnresolvedBlockingChildren",
          nodeId: "n1",
          unresolvedChildIds: ["c1"],
        },
        "closeNode",
      ),
    ).toBe(false);
  });

  it("keeps node-action failures local", () => {
    expect(
      isGlobalDomainError(
        {
          kind: "InvalidLifecycleTransition",
          nodeId: "n1",
          from: "open",
          attempted: "close",
        },
        "closeNode",
      ),
    ).toBe(false);
  });

  it("uses the global surface for unattributed system errors", () => {
    expect(
      isGlobalDomainError({
        kind: "InvalidActiveStack",
        reason: "cycle in parent chain",
      }),
    ).toBe(true);
  });
});
