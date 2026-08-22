import { classifyDiscovery } from "./classify.js";
import {
  defaultDefinitionOfDone,
  EXPLORATION_BUDGET,
  PROJECT_LEARNING_FRAMEWORK_ID,
  PROJECT_LEARNING_FRAMEWORK_VERSION,
  type CoreQuestionRole,
  type DefinitionOfDoneTemplate,
  type LearningDepth,
  type QuestionContract,
} from "./contract.js";
import type { RepositoryEvidence } from "./evidence.js";

export interface ProposedCoreQuestion extends QuestionContract {
  criteria: DefinitionOfDoneTemplate[];
}

export interface ProjectLearningProposal {
  frameworkId: typeof PROJECT_LEARNING_FRAMEWORK_ID;
  frameworkVersion: typeof PROJECT_LEARNING_FRAMEWORK_VERSION;
  positioning: string;
  learningValue: string;
  systemModel: string;
  coreQuestions: ProposedCoreQuestion[];
  recommendedFocusIndexes: number[];
}

export function runProjectLearningBootstrap(
  evidence: RepositoryEvidence,
): ProjectLearningProposal {
  const positioning = projectPositioning(evidence);
  const learningValue = learningValueJudgment(evidence);
  const systemModel = systemModelSummary(evidence);
  const coreQuestions = boundCoreQuestions(
    guidedQuestions(evidence, { positioning, learningValue, systemModel }),
    evidence.name,
  );
  return {
    frameworkId: PROJECT_LEARNING_FRAMEWORK_ID,
    frameworkVersion: PROJECT_LEARNING_FRAMEWORK_VERSION,
    positioning,
    learningValue,
    systemModel,
    coreQuestions,
    recommendedFocusIndexes: recommendFocus(coreQuestions),
  };
}

export { classifyDiscovery };

function projectPositioning(evidence: RepositoryEvidence): string {
  const repo = repositoryLabel(evidence);
  const description = evidence.description
    ? evidence.description
    : `${evidence.name} is a project worth a bounded learning pass.`;
  return repo
    ? `${evidence.name} (${repo}): ${description}`
    : `${evidence.name}: ${description}`;
}

function learningValueJudgment(evidence: RepositoryEvidence): string {
  const language = evidence.primaryLanguage
    ? ` Primary language signal: ${evidence.primaryLanguage}.`
    : "";
  const modules = evidence.keyModules.length
    ? ` Highest-value mechanisms appear to be ${joinAnd(evidence.keyModules.slice(0, 3))}.`
    : " Focus on the system's core runtime and the smallest set of mechanisms needed to use it.";
  return `This pass should learn ${evidence.name} as a working system, not as a complete encyclopedia.${language}${modules}`;
}

function systemModelSummary(evidence: RepositoryEvidence): string {
  const entry = evidence.entryPoints[0] ?? "its primary entry";
  const language = evidence.primaryLanguage
    ? ` in ${evidence.primaryLanguage}`
    : "";
  const signals = evidence.architectureSignals[0]
    ? ` Architecture signal: ${evidence.architectureSignals[0]}.`
    : "";
  return `${evidence.name} is learned from ${entry}${language} outward into a small set of core mechanisms.${signals}`;
}

function guidedQuestions(
  evidence: RepositoryEvidence,
  artifacts: { positioning: string; learningValue: string; systemModel: string },
): QuestionContract[] {
  const name = evidence.name;
  const repo = repositoryLabel(evidence);
  const subject = repo ? `${name} (${repo})` : name;
  const entry = evidence.entryPoints[0] ?? "the primary entry";
  const questions: QuestionContract[] = [
    {
      role: "positioning",
      targetDepth: "L2",
      question: `What problem does ${subject} solve, and who is it actually for?`,
      goal: `State the project positioning for ${name} in one paragraph, citing repository evidence.`,
    },
    {
      role: "system-model",
      targetDepth: "L2",
      question: `How is ${name} organized as a system from ${entry} to its primary output?`,
      goal: `Explain the ${name} system model and name the main modules that make it run.`,
    },
  ];

  const mechanisms = mechanismSubjects(evidence);
  for (const mechanism of mechanisms.slice(0, EXPLORATION_BUDGET.coreMechanisms - 1)) {
    questions.push({
      role: "core-mechanism",
      targetDepth: "L2",
      question: `How does ${name}'s ${mechanism} actually work?`,
      goal: `Explain the ${mechanism} well enough to predict ${name} behavior from project evidence.`,
    });
  }

  if (shouldIncludeEngineeringUse(evidence)) {
    const extension = mechanisms[0] ?? evidence.entryPoints[0] ?? "primary extension point";
    questions.push({
      role: "engineering-use",
      targetDepth: "L3",
      question: `How would I make a real change in ${name} using its ${extension}?`,
      goal: `Describe a concrete, near-term engineering change in ${name} and the evidence that it would work.`,
    });
  } else if (evidence.architectureSignals.length > 0 || evidence.topics.length > 0) {
    const peripheral = evidence.topics[0] ?? "adjacent surface";
    questions.push({
      role: "peripheral",
      targetDepth: "L1",
      question: `What surrounding ${peripheral} in ${name} is useful to recognize now, without implementing it?`,
      goal: `Recognize this peripheral part of ${name} well enough to ignore it until it blocks a core question.`,
    });
  }

  void artifacts;
  return questions;
}

function boundCoreQuestions(
  questions: QuestionContract[],
  projectName: string,
): ProposedCoreQuestion[] {
  const selected: QuestionContract[] = [];
  let mechanisms = 0;
  let l3 = 0;
  for (const question of questions) {
    if (selected.length >= EXPLORATION_BUDGET.coreQuestions) {
      break;
    }
    if (question.role === "core-mechanism" || question.role === "system-model") {
      if (mechanisms >= EXPLORATION_BUDGET.coreMechanisms) {
        continue;
      }
      mechanisms += 1;
    }
    if (question.targetDepth === "L3") {
      if (l3 >= EXPLORATION_BUDGET.l3Implementation) {
        continue;
      }
      l3 += 1;
    }
    selected.push(question);
  }
  return selected.map((question) => ({
    ...question,
    criteria: defaultDefinitionOfDone(question, projectName),
  }));
}

function recommendFocus(questions: ProposedCoreQuestion[]): number[] {
  const preferredRoles: CoreQuestionRole[] = [
    "system-model",
    "core-mechanism",
    "engineering-use",
    "positioning",
  ];
  const indexes: number[] = [];
  for (const role of preferredRoles) {
    const index = questions.findIndex(
      (question, current) => question.role === role && !indexes.includes(current),
    );
    if (index >= 0) {
      indexes.push(index);
    }
    if (indexes.length >= EXPLORATION_BUDGET.concurrentFocus) {
      break;
    }
  }
  return indexes;
}

function mechanismSubjects(evidence: RepositoryEvidence): string[] {
  const subjects = [
    ...evidence.keyModules,
    ...evidence.architectureSignals.filter((signal) => !evidence.description || signal !== evidence.description),
  ];
  return unique(subjects).slice(0, EXPLORATION_BUDGET.coreMechanisms);
}

function shouldIncludeEngineeringUse(evidence: RepositoryEvidence): boolean {
  return (
    evidence.entryPoints.length > 0 ||
    evidence.keyModules.length > 0 ||
    Boolean(evidence.primaryLanguage)
  );
}

function repositoryLabel(evidence: RepositoryEvidence): string | undefined {
  if (!evidence.repository) {
    return undefined;
  }
  return `${evidence.repository.owner}/${evidence.repository.repo}`;
}

function joinAnd(values: string[]): string {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0] ?? "";
  }
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function defaultTargetDepthForRole(role: CoreQuestionRole): LearningDepth {
  if (role === "engineering-use") {
    return "L3";
  }
  if (role === "peripheral") {
    return "L1";
  }
  return "L2";
}
