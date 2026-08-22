import {
  addCoreQuestion,
  addCriterion,
  CORE_QUESTION_LIMIT,
  createProject,
  type DomainEvent,
  type DomainSnapshot,
  type NodeId,
  type Ports,
} from "../domain/index.js";
import {
  CANONICAL_CONTRACT_ID,
  CANONICAL_CONTRACT_VERSION,
  EXPLORATION_BUDGET,
  LEARNING_TREE_ADAPTER_ID,
  LEARNING_TREE_ADAPTER_VERSION,
  normalizeRepositoryEvidence,
  parseGitHubSource,
  runProjectLearningBootstrap,
  type EvidenceInput,
  type EvidenceStatus,
  type RepositoryEvidenceSource,
} from "../framework/index.js";
import type { RepositoryEvidenceProvider } from "./repository-evidence.js";

export interface ProjectLearningBootstrapRecord {
  frameworkId: string;
  frameworkVersion: string;
  canonicalContractId: string;
  canonicalContractVersion: string;
  evidenceStatus: EvidenceStatus;
  positioning: string;
  learningValue: string;
  systemModel: string;
  recommendedFocusNodeIds: NodeId[];
  generatedQuestionCount: number;
}

export type BootstrapProjectResult =
  | {
      ok: true;
      snapshot: DomainSnapshot;
      record: ProjectLearningBootstrapRecord;
      events: DomainEvent[];
    }
  | { ok: false; error: import("../domain/errors.js").DomainError };

export async function bootstrapLearningProject(
  input: EvidenceInput,
  ports: Ports,
  provider?: RepositoryEvidenceProvider,
): Promise<BootstrapProjectResult> {
  const created = createProject(
    { name: input.name, source: input.source?.trim() || undefined },
    ports,
  );
  if (!created.ok) {
    return created;
  }

  const source = await loadEvidenceSource(
    {
      name: created.snapshot.project.name,
      source: created.snapshot.project.source,
      description: input.description,
    },
    provider,
  );
  const evidence = normalizeRepositoryEvidence(source);
  const proposal = runProjectLearningBootstrap(evidence);
  const questions = proposal.coreQuestions.slice(
    0,
    Math.min(EXPLORATION_BUDGET.coreQuestions, CORE_QUESTION_LIMIT),
  );

  let snapshot = created.snapshot;
  const events: DomainEvent[] = [...created.events];
  const createdNodeIds: NodeId[] = [];

  for (const question of questions) {
    const added = addCoreQuestion(
      snapshot,
      {
        question: question.question,
        goal: question.goal,
        targetDepth: question.targetDepth,
      },
      ports,
    );
    if (!added.ok) {
      return added;
    }
    snapshot = added.snapshot;
    events.push(...added.events);
    const nodeId = added.events.find((event) => event.type === "CoreQuestionAdded")?.nodeId;
    if (nodeId === undefined) {
      continue;
    }
    createdNodeIds.push(nodeId);
    for (const criterion of question.criteria) {
      const withCriterion = addCriterion(
        snapshot,
        {
          nodeId,
          description: criterion.description,
          required: criterion.required,
          evidenceRequired: criterion.evidenceRequired,
        },
        ports,
      );
      if (!withCriterion.ok) {
        return withCriterion;
      }
      snapshot = withCriterion.snapshot;
      events.push(...withCriterion.events);
    }
  }

  return {
    ok: true,
    snapshot,
    events,
    record: {
      frameworkId: proposal.frameworkId,
      frameworkVersion: proposal.frameworkVersion,
      canonicalContractId: proposal.canonicalContractId,
      canonicalContractVersion: proposal.canonicalContractVersion,
      evidenceStatus: proposal.evidenceStatus,
      positioning: proposal.positioning,
      learningValue: proposal.learningValue,
      systemModel: proposal.systemModel,
      recommendedFocusNodeIds: proposal.recommendedFocusIndexes.flatMap((index) => {
        const nodeId = createdNodeIds[index];
        return nodeId ? [nodeId] : [];
      }),
      generatedQuestionCount: createdNodeIds.length,
    },
  };
}

async function loadEvidenceSource(
  input: EvidenceInput,
  provider?: RepositoryEvidenceProvider,
): Promise<RepositoryEvidenceSource> {
  const repository = input.source ? parseGitHubSource(input.source) : undefined;
  const fallback: RepositoryEvidenceSource = {
    name: input.name,
    source: input.source,
    userDescription: input.description,
    repository,
    evidenceStatus: "fallback",
  };
  if (!repository || !provider) {
    return fallback;
  }
  try {
    const loaded = await provider.load(repository);
    return {
      ...loaded,
      name: input.name,
      source: input.source,
      userDescription: input.description,
      repository: loaded.repository ?? repository,
    };
  } catch {
    return fallback;
  }
}

export function isEmptyFirstLayer(snapshot: DomainSnapshot): boolean {
  return snapshot.pass.rootNodeIds.length === 0;
}

export type { EvidenceInput, EvidenceStatus };
export {
  CANONICAL_CONTRACT_ID,
  CANONICAL_CONTRACT_VERSION,
  LEARNING_TREE_ADAPTER_ID,
  LEARNING_TREE_ADAPTER_VERSION,
};
