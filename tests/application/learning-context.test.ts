import { describe, expect, it } from "vitest";
import {
  contextExcludesSiblingConversations,
  selectContextInspectorView,
  selectLearningContext,
} from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";

describe("learning context", () => {
  it("includes node learning facts for a node conversation", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectLearningContext(
      snapshot,
      { kind: "node", projectId: snapshot.project.id, nodeId: ids.q1 },
      [{ role: "user", content: "only q1" }],
    );
    expect(context.node?.question).toBe("Q1");
    expect(context.node?.goal).toBe("Understand Q1");
    expect(context.node?.parentId).toBeUndefined();
    expect(context.node?.ancestorPath[0]?.question).toBe("Q1");
    expect(context.activeStack.map((item) => item.question)).toContain("Q1");
    expect(context.node?.definitionOfDone).toBeDefined();
    expect(context.node?.unresolvedBlockingChildren.some((child) => child.question === "Q1.2")).toBe(
      true,
    );
    expect(context.included.boundNode).toBe(true);
    expect(context.conversation).toEqual([{ role: "user", content: "only q1" }]);
  });

  it("excludes sibling conversation messages by default", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectLearningContext(
      snapshot,
      { kind: "node", projectId: snapshot.project.id, nodeId: ids.q1 },
      [{ role: "user", content: "q1 only" }],
    );
    expect(
      contextExcludesSiblingConversations(context, [
        { role: "user", content: "sibling q2 secret" },
      ]),
    ).toBe(true);
  });

  it("builds project context without a bound node", () => {
    const { snapshot } = createDemoTreeFixture();
    const context = selectLearningContext(snapshot, {
      kind: "project",
      projectId: snapshot.project.id,
    });
    expect(context.node).toBeUndefined();
    expect(context.included.frontier).toBe(true);
    expect(context.included.materializedTree).toBe(true);
    expect(context.projectSummary?.name).toBe("M2 Demo Tree");
    const view = selectContextInspectorView(context);
    expect(view.kind).toBe("project");
    expect(view.projectName).toBe("M2 Demo Tree");
  });

  it("exposes parent, stack, DoD, evidence, and summary to the inspector view", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectLearningContext(
      snapshot,
      { kind: "node", projectId: snapshot.project.id, nodeId: ids.q11 },
      [{ role: "assistant", content: "closed child" }],
    );
    expect(context.node?.parentQuestion).toBe("Q1");
    expect(context.node?.summary).toContain("Q1.1");
    expect(context.node?.evidence.length).toBeGreaterThan(0);
    const view = selectContextInspectorView(context);
    expect(view.currentQuestion).toBe("Q1.1");
    expect(view.parentQuestion).toBe("Q1");
    expect(view.learningPath).toContain("Q1");
    expect(view.evidence.length).toBeGreaterThan(0);
    expect(view.conversationPreview).toContain("closed child");
  });
});
