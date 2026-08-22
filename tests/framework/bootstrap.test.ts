import { describe, expect, it } from "vitest";
import {
  CANONICAL_CONTRACT_ID,
  CANONICAL_CONTRACT_VERSION,
  classifyDiscovery,
  EXPLORATION_BUDGET,
  LEARNING_TREE_ADAPTER_ID,
  LEARNING_TREE_ADAPTER_VERSION,
  normalizeRepositoryEvidence,
  parseGitHubSource,
  runProjectLearningBootstrap,
} from "../../src/framework/index.js";
import { CORE_QUESTION_LIMIT } from "../../src/domain/index.js";
import { REACT_GITHUB_FIXTURE, VITE_GITHUB_FIXTURE } from "../fixtures/github-api.js";
import { evidenceSourceFromGitHubFixture } from "../fixtures/repository-evidence.js";

describe("Coco Project Learning adapter", () => {
  it("keeps projected runtime budgets aligned with the domain core-question limit", () => {
    expect(EXPLORATION_BUDGET.coreQuestions).toBe(CORE_QUESTION_LIMIT);
    expect(EXPLORATION_BUDGET.coreQuestions).toBeLessThanOrEqual(5);
    expect(EXPLORATION_BUDGET.concurrentFocus).toBeLessThanOrEqual(2);
    expect(EXPLORATION_BUDGET.branchDepth).toBeLessThanOrEqual(3);
    expect(EXPLORATION_BUDGET.l3Implementation).toBe(1);
  });

  it("identifies the adapter against the canonical Coco contract", () => {
    const proposal = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(evidenceSourceFromGitHubFixture(VITE_GITHUB_FIXTURE, "Vite")),
    );
    expect(proposal.canonicalContractId).toBe(CANONICAL_CONTRACT_ID);
    expect(proposal.canonicalContractVersion).toBe(CANONICAL_CONTRACT_VERSION);
    expect(proposal.frameworkId).toBe(LEARNING_TREE_ADAPTER_ID);
    expect(proposal.frameworkVersion).toBe(LEARNING_TREE_ADAPTER_VERSION);
    expect(proposal.evidenceStatus).toBe("verified");
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

  it("generates a bounded first layer from GitHub README/tree/topics, not a copied checklist", () => {
    const vite = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(evidenceSourceFromGitHubFixture(VITE_GITHUB_FIXTURE, "Vite")),
    );
    const react = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(evidenceSourceFromGitHubFixture(REACT_GITHUB_FIXTURE, "React")),
    );

    expect(vite.coreQuestions.length).toBeGreaterThan(0);
    expect(vite.coreQuestions.length).toBeLessThanOrEqual(EXPLORATION_BUDGET.coreQuestions);
    expect(vite.coreQuestions.every((question) => question.question.includes("Vite"))).toBe(true);
    expect(react.coreQuestions.every((question) => question.question.includes("React"))).toBe(true);
    expect(vite.coreQuestions.map((question) => question.question)).not.toEqual(
      react.coreQuestions.map((question) => question.question),
    );
    expect(
      vite.coreQuestions.some((question) => /plugin pipeline|dev server/i.test(question.question)),
    ).toBe(true);
    expect(react.coreQuestions.some((question) => /reconcil/i.test(question.question))).toBe(true);
    expect(
      vite.coreQuestions.filter((question) => question.targetDepth === "L3").length,
    ).toBeLessThanOrEqual(EXPLORATION_BUDGET.l3Implementation);
    expect(vite.recommendedFocusIndexes.length).toBeGreaterThan(0);
    expect(vite.recommendedFocusIndexes.length).toBeLessThanOrEqual(
      EXPLORATION_BUDGET.concurrentFocus,
    );
  });

  it("keeps mechanism questions project-specific when the display name is generic", () => {
    const vite = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(
        evidenceSourceFromGitHubFixture(VITE_GITHUB_FIXTURE, "Frontend Tool"),
      ),
    );
    const react = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(
        evidenceSourceFromGitHubFixture(REACT_GITHUB_FIXTURE, "Frontend Tool"),
      ),
    );
    expect(vite.coreQuestions.map((question) => question.question)).not.toEqual(
      react.coreQuestions.map((question) => question.question),
    );
    expect(
      vite.coreQuestions.some((question) => /plugin pipeline|dev server/i.test(question.question)),
    ).toBe(true);
    expect(react.coreQuestions.some((question) => /reconcil/i.test(question.question))).toBe(true);
  });

  it("does not treat a user description as verified repository evidence", () => {
    const evidence = normalizeRepositoryEvidence({
      name: "Mystery",
      source: "acme/mystery",
      userDescription: "plugin pipeline and reconciliation",
      evidenceStatus: "fallback",
    });
    expect(evidence.evidenceStatus).toBe("fallback");
    const proposal = runProjectLearningBootstrap(evidence);
    expect(proposal.evidenceStatus).toBe("fallback");
  });

  it("does not eagerly generate child questions", () => {
    const proposal = runProjectLearningBootstrap(
      normalizeRepositoryEvidence(evidenceSourceFromGitHubFixture(VITE_GITHUB_FIXTURE, "Vite")),
    );
    expect(proposal.coreQuestions.length).toBeGreaterThan(1);
    expect(
      proposal.coreQuestions.every(
        (question) => question.role === "positioning" || question.question.includes("Vite"),
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
