import { describe, expect, it } from "vitest";
import { bootstrapLearningProject } from "../../src/application/index.js";
import { CORE_QUESTION_LIMIT, createProject } from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

describe("bootstrapLearningProject", () => {
  it("creates a non-empty first learning layer through Domain operations", () => {
    const result = bootstrapLearningProject(
      {
        name: "Vite",
        source: "https://github.com/vitejs/vite",
        description: "Frontend tooling with a plugin pipeline",
      },
      sequentialFixturePorts(100),
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }

    expect(result.snapshot.project.name).toBe("Vite");
    expect(result.snapshot.project.source).toBe("https://github.com/vitejs/vite");
    expect(result.snapshot.pass.rootNodeIds.length).toBeGreaterThan(0);
    expect(result.snapshot.pass.rootNodeIds.length).toBeLessThanOrEqual(CORE_QUESTION_LIMIT);
    expect(result.snapshot.pass.activeStack).toEqual([]);
    expect(result.snapshot.pass.currentFocusNodeId).toBeUndefined();

    for (const nodeId of result.snapshot.pass.rootNodeIds) {
      const node = result.snapshot.nodes[nodeId];
      expect(node?.parentId).toBeUndefined();
      expect(node?.childIds).toEqual([]);
      expect(node?.lifecycle).toBe("open");
      expect(node?.goal.length).toBeGreaterThan(0);
      expect(node?.definitionOfDone.length).toBeGreaterThan(0);
    }

    expect(result.record.generatedQuestionCount).toBe(
      result.snapshot.pass.rootNodeIds.length,
    );
    expect(result.record.recommendedFocusNodeIds.length).toBeGreaterThan(0);
    expect(result.record.recommendedFocusNodeIds.length).toBeLessThanOrEqual(2);
    for (const nodeId of result.record.recommendedFocusNodeIds) {
      expect(result.snapshot.nodes[nodeId]).toBeDefined();
    }
  });

  it("keeps Domain createProject empty so bootstrap remains an application orchestration", () => {
    const created = createProject({ name: "Manual" }, sequentialFixturePorts(1));
    if (!created.ok) {
      throw new Error(created.error.kind);
    }
    expect(created.snapshot.pass.rootNodeIds).toEqual([]);
  });

  it("rejects a blank project name before generating questions", () => {
    const result = bootstrapLearningProject({ name: "   " }, sequentialFixturePorts());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ kind: "ProjectNameRequired" });
  });
});
