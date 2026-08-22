import { describe, expect, it } from "vitest";
import { bootstrapLearningProject } from "../../src/application/index.js";
import { CORE_QUESTION_LIMIT, createProject } from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { VITE_GITHUB_FIXTURE } from "../fixtures/github-api.js";
import {
  createFixtureRepositoryEvidenceProvider,
  createRejectingRepositoryEvidenceProvider,
} from "../fixtures/repository-evidence.js";

describe("bootstrapLearningProject", () => {
  it("creates a non-empty first learning layer through Domain operations", async () => {
    const result = await bootstrapLearningProject(
      {
        name: "Vite",
        source: "https://github.com/vitejs/vite",
      },
      sequentialFixturePorts(100),
      createFixtureRepositoryEvidenceProvider(VITE_GITHUB_FIXTURE),
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }

    expect(result.snapshot.project.name).toBe("Vite");
    expect(result.snapshot.project.source).toBe("https://github.com/vitejs/vite");
    expect(result.snapshot.pass.projectRootNodeId).toBeUndefined();

    const coreQuestionIds = result.snapshot.pass.rootNodeIds;
    expect(coreQuestionIds.length).toBeGreaterThan(0);
    expect(coreQuestionIds.length).toBeLessThanOrEqual(CORE_QUESTION_LIMIT);
    expect(result.snapshot.pass.activeStack).toEqual([]);
    expect(result.snapshot.pass.currentFocusNodeId).toBeUndefined();
    expect(result.record.evidenceStatus).toBe("verified");
    expect(result.record.canonicalContractId).toBe("coco-project-learning-contract");
    expect(result.record.frameworkId).toBe("learning-tree-coco-adapter");

    for (const nodeId of coreQuestionIds) {
      const node = result.snapshot.nodes[nodeId];
      expect(node?.parentId).toBeUndefined();
      expect(node?.lifecycle).toBe("open");
      expect(node?.goal.length).toBeGreaterThan(0);
      expect(node?.definitionOfDone.length).toBeGreaterThan(0);
      expect(node?.question).not.toBe("Vite");
    }

    expect(result.record.generatedQuestionCount).toBe(coreQuestionIds.length);
    expect(result.record.recommendedFocusNodeIds.length).toBeGreaterThan(0);
    expect(result.record.recommendedFocusNodeIds.length).toBeLessThanOrEqual(2);
    for (const nodeId of result.record.recommendedFocusNodeIds) {
      expect(coreQuestionIds).toContain(nodeId);
      expect(result.snapshot.nodes[nodeId]).toBeDefined();
    }
    expect(
      Object.values(result.snapshot.nodes).some((node) =>
        /plugin pipeline|dev server/i.test(node.question),
      ),
    ).toBe(true);
  });

  it("records partial evidence when the provider returns a partial source", async () => {
    const result = await bootstrapLearningProject(
      { name: "React", source: "facebook/react" },
      sequentialFixturePorts(250),
      {
        async load() {
          return {
            name: "React",
            repository: { owner: "facebook", repo: "react" },
            metadata: { language: "JavaScript" },
            evidenceStatus: "partial",
          };
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }
    expect(result.record.evidenceStatus).toBe("partial");
    expect(result.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(result.snapshot.pass.rootNodeIds.length).toBeGreaterThan(0);
    for (const rootId of result.snapshot.pass.rootNodeIds) {
      expect(result.snapshot.nodes[rootId]?.parentId).toBeUndefined();
    }
  });

  it("creates the project with fallback evidence when the provider rejects", async () => {
    const result = await bootstrapLearningProject(
      { name: "Vite", source: "vitejs/vite" },
      sequentialFixturePorts(200),
      createRejectingRepositoryEvidenceProvider(),
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }
    expect(result.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(result.snapshot.pass.rootNodeIds.length).toBeGreaterThan(0);
    expect(result.record.evidenceStatus).toBe("fallback");
  });

  it("skips the provider and marks fallback when there is no GitHub source", async () => {
    let loaded = false;
    const result = await bootstrapLearningProject(
      { name: "Notebook" },
      sequentialFixturePorts(300),
      {
        load: async () => {
          loaded = true;
          throw new Error("should not load");
        },
      },
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }
    expect(loaded).toBe(false);
    expect(result.record.evidenceStatus).toBe("fallback");
  });

  it("keeps Domain createProject empty so bootstrap remains an application orchestration", () => {
    const created = createProject({ name: "Manual" }, sequentialFixturePorts(1));
    if (!created.ok) {
      throw new Error(created.error.kind);
    }
    expect(created.snapshot.pass.rootNodeIds).toEqual([]);
  });

  it("rejects a blank project name before generating questions", async () => {
    const result = await bootstrapLearningProject({ name: "   " }, sequentialFixturePorts());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ kind: "ProjectNameRequired" });
  });

  it("generates Chinese guided questions and DoD when locale is zh-CN", async () => {
    const result = await bootstrapLearningProject(
      {
        name: "Vite",
        source: "https://github.com/vitejs/vite",
      },
      sequentialFixturePorts(400),
      createFixtureRepositoryEvidenceProvider(VITE_GITHUB_FIXTURE),
      "zh-CN",
    );
    if (!result.ok) {
      throw new Error(result.error.kind);
    }
    const firstRootId = result.snapshot.pass.rootNodeIds[0];
    const firstNode = firstRootId ? result.snapshot.nodes[firstRootId] : undefined;
    expect(firstNode?.question).toMatch(/主要解决什么问题/);
    expect(firstNode?.definitionOfDone[0]?.description).toMatch(/项目证据|机制/);
    expect(result.record.learningValue).toMatch(/这次学习应把/);
  });
});
