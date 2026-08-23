import {
  evaluateConvergence,
  type CriterionId,
  type DomainSnapshot,
  type NodeId,
} from "../../domain/index.js";

export type CloseRequirement =
  | { kind: "summary"; met: boolean }
  | {
      kind: "criterion";
      met: boolean;
      criterionId: CriterionId;
      description: string;
    }
  | {
      kind: "evidence";
      met: boolean;
      criterionId: CriterionId;
      description: string;
    }
  | {
      kind: "blockingChildren";
      met: boolean;
      count: number;
      questions: string[];
    };

export interface CloseReadiness {
  allowed: boolean;
  requirements: CloseRequirement[];
}

export function selectCloseReadiness(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): CloseReadiness {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return { allowed: false, requirements: [] };
  }
  if (snapshot.pass.projectRootNodeId === nodeId) {
    return { allowed: false, requirements: [] };
  }

  const result = evaluateConvergence(snapshot, { nodeId });
  const failures = result.ok ? result.evaluation.failures : [result.error];
  const canClose = result.ok && result.evaluation.canClose;

  const unmetCriteria = new Set<CriterionId>();
  const unmetEvidence = new Set<CriterionId>();
  let unmetSummary = false;
  let unresolvedChildIds: NodeId[] = [];
  let blockingFailed = false;

  for (const failure of failures) {
    if (failure.kind === "SummaryRequired") {
      unmetSummary = true;
    }
    if (failure.kind === "CriterionNotSatisfied") {
      unmetCriteria.add(failure.criterionId);
    }
    if (failure.kind === "MissingRequiredEvidence") {
      unmetEvidence.add(failure.criterionId);
    }
    if (failure.kind === "UnresolvedBlockingChildren") {
      blockingFailed = true;
      unresolvedChildIds = failure.unresolvedChildIds;
    }
  }

  const requirements: CloseRequirement[] = [
    { kind: "summary", met: !unmetSummary },
  ];

  for (const criterion of node.definitionOfDone) {
    if (!criterion.required) {
      continue;
    }
    requirements.push({
      kind: "criterion",
      met: !unmetCriteria.has(criterion.id),
      criterionId: criterion.id,
      description: criterion.description,
    });
    if (criterion.evidenceRequired) {
      requirements.push({
        kind: "evidence",
        met: !unmetEvidence.has(criterion.id),
        criterionId: criterion.id,
        description: criterion.description,
      });
    }
  }

  if (node.blockingChildIds.length > 0) {
    const questions = unresolvedChildIds
      .map((childId) => snapshot.nodes[childId]?.question)
      .filter((question): question is string => question !== undefined);
    requirements.push({
      kind: "blockingChildren",
      met: !blockingFailed,
      count: unresolvedChildIds.length,
      questions,
    });
  }

  return {
    allowed: node.lifecycle !== "closed" && canClose,
    requirements,
  };
}
