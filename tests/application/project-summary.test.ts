import { describe, expect, it } from "vitest";
import { selectProjectSummary } from "../../src/application/index.js";
import {
  createDemoTreeFixture,
  createSecondDemoTreeFixture,
} from "../../src/fixtures/demo-tree.js";

describe("selectProjectSummary", () => {
  it("derives completion, active question, and blocked signals without domain progress fields", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const summary = selectProjectSummary(snapshot);

    expect(summary.projectId).toBe(snapshot.project.id);
    expect(summary.name).toBe("M2 Demo Tree");
    expect(summary.completionLevel).toBe(1 / 4);
    expect(summary.activeQuestion).toBe("Q1");
    expect(summary.isBlocked).toBe(true);
    expect(summary.unresolvedBlockerCount).toBe(1);
    expect(snapshot.project).not.toHaveProperty("completionLevel");
    expect(snapshot.pass).not.toHaveProperty("completionLevel");
    expect(ids.q12).toBeDefined();
  });

  it("reads the Active Stack leaf rather than Current Focus as the active question", () => {
    const { snapshot } = createSecondDemoTreeFixture();
    const summary = selectProjectSummary(snapshot);
    expect(summary.activeQuestion).toBe("Alpha");
    expect(summary.isBlocked).toBe(true);
    expect(summary.completionLevel).toBe(0);
    expect(snapshot.pass.currentFocusNodeId).not.toBe(
      snapshot.pass.activeStack[0],
    );
  });
});
