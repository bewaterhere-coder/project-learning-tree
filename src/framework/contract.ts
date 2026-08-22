/**
 * Versioned Coco Project Learning Contract.
 *
 * This module is the methodology source of truth. UI must not restate these
 * budgets or classification rules as competing constants.
 */

export const PROJECT_LEARNING_FRAMEWORK_ID = "coco-project-learning" as const;
export const PROJECT_LEARNING_FRAMEWORK_VERSION = "v1" as const;

export type FrameworkId = typeof PROJECT_LEARNING_FRAMEWORK_ID;
export type FrameworkVersion = typeof PROJECT_LEARNING_FRAMEWORK_VERSION;

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
