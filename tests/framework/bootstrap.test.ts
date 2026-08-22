import { describe, expect, it } from "vitest";
import {
  classifyDiscovery,
  deriveRepositoryEvidence,
  EXPLORATION_BUDGET,
  parseGitHubSource,
  PROJECT_LEARNING_FRAMEWORK_ID,
  PROJECT_LEARNING_FRAMEWORK_VERSION,
  runProjectLearningBootstrap,
} from "../../src/framework/index.js";
import { CORE_QUESTION_LIMIT } from "../../src/domain/index.js";

describe("Coco Project Learning Contract", () => {
  it("keeps exploration budgets aligned with the domain core-question limit", () => {
    expect(EXPLORATION_BUDGET.coreQuestions).toBe(CORE_QUESTION_LIMIT);
    expect(EXPLORATION_BUDGET.coreQuestions).toBeLessThanOrEqual(5);
    expect(EXPLORATION_BUDGET.concurrentFocus).toBeLessThanOrEqual(2);
    expect(EXPLORATION_BUDGET.branchDepth).toBeLessThanOrEqual(3);
    expect(EXPLORATION_BUDGET.l3Implementation).toBe(1);
  });

  it("parses GitHub owner/repo from URL, short form, and #项目学习", () => {
    expect(parseGitHubSource("https://github.com/vitejs/vite.git")).toEqual({
      owner: "vitejs",
      repo: "vite",
    });
    expect(parseGitHubSource("facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
    });
    expect(parseGitHubSource("#项目学习 bewaterhere-coder/project-learning-tree")).toEqual({
      owner: "bewaterhere-coder",
      repo: "project-learning-tree",
    });
  });

  it("generates a bounded first layer that is project-specific, not a copied checklist", () => {
    const vite = runProjectLearningBootstrap(
      deriveRepositoryEvidence({
        name: "Vite",
        source: "vitejs/vite",
        description: "Next generation frontend tooling with a plugin pipeline and dev server",
      }),
    );
    const react = runProjectLearningBootstrap(
      deriveRepositoryEvidence({
        name: "React",
        source: "facebook/react",
        description: "A JavaScript library for building user interfaces with reconciliation",
      }),
    );

    expect(vite.frameworkId).toBe(PROJECT_LEARNING_FRAMEWORK_ID);
    expect(vite.frameworkVersion).toBe(PROJECT_LEARNING_FRAMEWORK_VERSION);
    expect(vite.coreQuestions.length).toBeGreaterThan(0);
    expect(vite.coreQuestions.length).toBeLessThanOrEqual(EXPLORATION_BUDGET.coreQuestions);
    expect(vite.coreQuestions.every((question) => question.question.includes("Vite"))).toBe(
      true,
    );
    expect(react.coreQuestions.every((question) => question.question.includes("React"))).toBe(
      true,
    );
    expect(vite.coreQuestions.map((question) => question.question)).not.toEqual(
      react.coreQuestions.map((question) => question.question),
    );
    expect(vite.coreQuestions.some((question) => /plugin pipeline|dev server/i.test(question.question))).toBe(
      true,
    );
    expect(react.coreQuestions.some((question) => /reconcil/i.test(question.question))).toBe(
      true,
    );
    expect(
      vite.coreQuestions.filter((question) => question.targetDepth === "L3").length,
    ).toBeLessThanOrEqual(EXPLORATION_BUDGET.l3Implementation);
    expect(vite.recommendedFocusIndexes.length).toBeGreaterThan(0);
    expect(vite.recommendedFocusIndexes.length).toBeLessThanOrEqual(
      EXPLORATION_BUDGET.concurrentFocus,
    );
  });

  it("does not eagerly generate child questions", () => {
    const proposal = runProjectLearningBootstrap(
      deriveRepositoryEvidence({
        name: "Learning Tree",
        source: "bewaterhere-coder/project-learning-tree",
        description: "Node-centered learning with a domain engine and workspace session",
      }),
    );
    expect(proposal.coreQuestions.length).toBeGreaterThan(1);
    expect(
      proposal.coreQuestions.every(
        (question) => question.role === "positioning" || question.question.includes("Learning Tree"),
      ),
    ).toBe(true);
  });

  it("classifies only Definition-of-Done blockers as blocking children", () => {
    expect(classifyDiscovery({ blocksCurrentDefinitionOfDone: true }).destination).toBe(
      "blocking",
    );
    expect(classifyDiscovery({ blocksCurrentDefinitionOfDone: false }).destination).toBe(
      "frontier",
    );
  });
});
