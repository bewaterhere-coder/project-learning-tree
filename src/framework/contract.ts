/**
 * Learning Tree's versioned executable adapter of the Coco Project Learning
 * Contract.
 *
 * Canonical methodology: Coco Project Learning Contract
 * (`coco-project-learning-contract` / `v1`).
 *
 * This module is not a second methodology source of truth. It is the Learning
 * Tree runtime projection (`learning-tree-coco-adapter` / `v1`) that copies
 * deterministic defaults so bootstrap can run without a live contract document.
 * UI must not restate these budgets as competing constants.
 */

export const CANONICAL_CONTRACT_ID = "coco-project-learning-contract" as const;
export const CANONICAL_CONTRACT_VERSION = "v1" as const;

export const LEARNING_TREE_ADAPTER_ID = "learning-tree-coco-adapter" as const;
export const LEARNING_TREE_ADAPTER_VERSION = "v1" as const;

/** Persisted `frameworkId` on pre-adapter bootstrap records. */
export const LEGACY_FRAMEWORK_ID = "coco-project-learning" as const;

export const PROJECT_LEARNING_FRAMEWORK_ID = LEARNING_TREE_ADAPTER_ID;
export const PROJECT_LEARNING_FRAMEWORK_VERSION = LEARNING_TREE_ADAPTER_VERSION;

export type CanonicalContractId = typeof CANONICAL_CONTRACT_ID;
export type CanonicalContractVersion = typeof CANONICAL_CONTRACT_VERSION;
export type AdapterId = typeof LEARNING_TREE_ADAPTER_ID;
export type AdapterVersion = typeof LEARNING_TREE_ADAPTER_VERSION;
export type FrameworkId = AdapterId;
export type FrameworkVersion = AdapterVersion;

export type LearningDepth = "L1" | "L2" | "L3";

export type CoreQuestionRole =
  | "positioning"
  | "system-model"
  | "core-mechanism"
  | "engineering-use"
  | "peripheral";

export interface ExplorationBudget {
  coreQuestions: number;
  concurrentFocus: number;
  branchDepth: number;
  coreMechanisms: number;
  l3Implementation: number;
}

/**
 * Deterministic runtime defaults projected by this adapter. They copy the
 * published Coco Project Learning Contract v1 budgets so the adapter can
 * execute locally. They are not canonical methodology truth.
 *
 * Domain `CORE_QUESTION_LIMIT` remains an operational tree cap, not a
 * methodology constant.
 */
export const EXPLORATION_BUDGET: ExplorationBudget = {
  coreQuestions: 5,
  concurrentFocus: 2,
  branchDepth: 3,
  coreMechanisms: 3,
  l3Implementation: 1,
};

export const BOOTSTRAP_PIPELINE = [
  "repository",
  "project-positioning",
  "learning-value",
  "system-model",
  "guided-question-generation",
  "core-questions",
  "recommended-current-focus",
] as const;

export type BootstrapPipelineStage = (typeof BOOTSTRAP_PIPELINE)[number];

export interface QuestionContract {
  question: string;
  goal: string;
  targetDepth: LearningDepth;
  role: CoreQuestionRole;
}

export interface DefinitionOfDoneTemplate {
  description: string;
  required: boolean;
  evidenceRequired: boolean;
}

export function defaultDefinitionOfDone(
  question: QuestionContract,
  projectName: string,
): DefinitionOfDoneTemplate[] {
  if (question.targetDepth === "L3") {
    return [
      {
        description: `Make or describe a real change in ${projectName} that uses this mechanism.`,
        required: true,
        evidenceRequired: true,
      },
    ];
  }
  if (question.targetDepth === "L2") {
    return [
      {
        description: `Explain this ${projectName} mechanism with project-specific evidence.`,
        required: true,
        evidenceRequired: true,
      },
    ];
  }
  return [
    {
      description: `Explain this part of ${projectName} in your own words at a recognition level.`,
      required: true,
      evidenceRequired: false,
    },
  ];
}
