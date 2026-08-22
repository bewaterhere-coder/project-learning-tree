import { classifyDiscovery } from "./classify.js";
import {
  CANONICAL_CONTRACT_ID,
  CANONICAL_CONTRACT_VERSION,
  defaultDefinitionOfDone,
  EXPLORATION_BUDGET,
  LEARNING_TREE_ADAPTER_ID,
  LEARNING_TREE_ADAPTER_VERSION,
  type CoreQuestionRole,
  type DefinitionOfDoneTemplate,
  type LearningDepth,
  type QuestionContract,
} from "./contract.js";
import type { EvidenceStatus, RepositoryEvidence } from "./evidence.js";
import {
  DEFAULT_GENERATION_LOCALE,
  type GenerationLocale,
} from "./locale.js";

export interface ProposedCoreQuestion extends QuestionContract {
  criteria: DefinitionOfDoneTemplate[];
}

export interface ProjectLearningProposal {
  frameworkId: typeof LEARNING_TREE_ADAPTER_ID;
  frameworkVersion: typeof LEARNING_TREE_ADAPTER_VERSION;
  canonicalContractId: typeof CANONICAL_CONTRACT_ID;
  canonicalContractVersion: typeof CANONICAL_CONTRACT_VERSION;
  evidenceStatus: EvidenceStatus;
  positioning: string;
  learningValue: string;
  systemModel: string;
  coreQuestions: ProposedCoreQuestion[];
  recommendedFocusIndexes: number[];
}

export function runProjectLearningBootstrap(
  evidence: RepositoryEvidence,
  locale: GenerationLocale = DEFAULT_GENERATION_LOCALE,
): ProjectLearningProposal {
  const positioning = projectPositioning(evidence, locale);
  const learningValue = learningValueJudgment(evidence, locale);
  const systemModel = systemModelSummary(evidence, locale);
  const coreQuestions = boundCoreQuestions(
    guidedQuestions(
      evidence,
      { positioning, learningValue, systemModel },
      locale,
    ),
    evidence.name,
    locale,
  );
  return {
    frameworkId: LEARNING_TREE_ADAPTER_ID,
    frameworkVersion: LEARNING_TREE_ADAPTER_VERSION,
    canonicalContractId: CANONICAL_CONTRACT_ID,
    canonicalContractVersion: CANONICAL_CONTRACT_VERSION,
    evidenceStatus: evidence.evidenceStatus,
    positioning,
    learningValue,
    systemModel,
    coreQuestions,
    recommendedFocusIndexes: recommendFocus(coreQuestions),
  };
}

export { classifyDiscovery };

function projectPositioning(
  evidence: RepositoryEvidence,
  locale: GenerationLocale,
): string {
  const repo = repositoryLabel(evidence);
  if (locale === "zh-CN") {
    const description = evidence.description
      ? evidence.description
      : `${evidence.name} 是一个值得做一次有边界学习探索的项目。`;
    return repo
      ? `${evidence.name}（${repo}）：${description}`
      : `${evidence.name}：${description}`;
  }
  const description = evidence.description
    ? evidence.description
    : `${evidence.name} is a project worth a bounded learning pass.`;
  return repo
    ? `${evidence.name} (${repo}): ${description}`
    : `${evidence.name}: ${description}`;
}

function learningValueJudgment(
  evidence: RepositoryEvidence,
  locale: GenerationLocale,
): string {
  const language = evidence.primaryLanguage
    ? locale === "zh-CN"
      ? ` 主要语言信号：${evidence.primaryLanguage}。`
      : ` Primary language signal: ${evidence.primaryLanguage}.`
    : "";
  const modules = evidence.keyModules.length
    ? locale === "zh-CN"
      ? ` 最值得深入的核心机制可能是 ${joinAnd(evidence.keyModules.slice(0, 3))}。`
      : ` Highest-value mechanisms appear to be ${joinAnd(evidence.keyModules.slice(0, 3))}.`
    : locale === "zh-CN"
      ? " 先聚焦系统的核心运行方式，以及真正需要理解的最小机制集合。"
      : " Focus on the system's core runtime and the smallest set of mechanisms needed to use it.";
  if (locale === "zh-CN") {
    return `这次学习应把 ${evidence.name} 当作一个可运行的系统来理解，而不是当作完整百科全书。${language}${modules}`;
  }
  return `This pass should learn ${evidence.name} as a working system, not as a complete encyclopedia.${language}${modules}`;
}

function systemModelSummary(
  evidence: RepositoryEvidence,
  locale: GenerationLocale,
): string {
  const entry = evidence.entryPoints[0] ?? "its primary entry";
  const language = evidence.primaryLanguage
    ? locale === "zh-CN"
      ? `，主要使用 ${evidence.primaryLanguage}`
      : ` in ${evidence.primaryLanguage}`
    : "";
  const signals = evidence.architectureSignals[0]
    ? locale === "zh-CN"
      ? ` 架构信号：${evidence.architectureSignals[0]}。`
      : ` Architecture signal: ${evidence.architectureSignals[0]}.`
    : "";
  if (locale === "zh-CN") {
    const entryLabel = evidence.entryPoints[0] ?? "主要入口";
    return `${evidence.name} 的学习路径从 ${entryLabel}${language} 出发，逐步扩展到一小撮核心机制。${signals}`;
  }
  return `${evidence.name} is learned from ${entry}${language} outward into a small set of core mechanisms.${signals}`;
}

function guidedQuestions(
  evidence: RepositoryEvidence,
  artifacts: { positioning: string; learningValue: string; systemModel: string },
  locale: GenerationLocale,
): QuestionContract[] {
  const name = evidence.name;
  const repo = repositoryLabel(evidence);
  const subject = repo ? `${name} (${repo})` : name;
  const entry = evidence.entryPoints[0] ?? "the primary entry";
  const entryZh = evidence.entryPoints[0] ?? "主要入口";

  if (locale === "zh-CN") {
    const questions: QuestionContract[] = [
      {
        role: "positioning",
        targetDepth: "L2",
        question: `${name} 这个项目主要解决什么问题，面向谁？`,
        goal: `用一段话说明 ${subject} 的项目定位，并引用仓库证据。`,
      },
      {
        role: "system-model",
        targetDepth: "L2",
        question: `${name} 从 ${entryZh} 到主要输出，系统是如何组织的？`,
        goal: `解释 ${name} 的系统模型，并点出让它运行的主要模块。`,
      },
    ];

    const mechanisms = mechanismSubjects(evidence);
    for (const mechanism of mechanisms.slice(0, EXPLORATION_BUDGET.coreMechanisms - 1)) {
      questions.push({
        role: "core-mechanism",
        targetDepth: "L2",
        question: `${name} 的 ${mechanism} 是如何工作的？`,
        goal: `结合项目证据，解释 ${mechanism} 如何影响 ${name} 的行为。`,
      });
    }

    if (shouldIncludeEngineeringUse(evidence)) {
      const extension = mechanisms[0] ?? evidence.entryPoints[0] ?? "主要扩展点";
      questions.push({
        role: "engineering-use",
        targetDepth: "L3",
        question: `如何使用 ${name} 的 ${extension} 做一项真实的改动？`,
        goal: `描述一项近期可在 ${name} 中落地的工程改动，并说明支撑它的证据。`,
      });
    } else if (evidence.architectureSignals.length > 0 || evidence.topics.length > 0) {
      const peripheral = evidence.topics[0] ?? "周边模块";
      questions.push({
        role: "peripheral",
        targetDepth: "L1",
        question: `${name} 中与 ${peripheral} 相关的部分，现在需要认识到什么程度？`,
        goal: `能识别 ${name} 的这一周边部分，并在它尚未阻塞核心问题前先搁置。`,
      });
    }

    void artifacts;
    return questions;
  }

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
  locale: GenerationLocale,
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
    criteria: defaultDefinitionOfDone(question, projectName, locale),
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
