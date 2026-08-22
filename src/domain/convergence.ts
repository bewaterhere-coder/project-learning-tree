import type { DomainError } from "./errors.js";
import { unresolvedBlockingChildIds } from "./blocking.js";
import type {
  ConvergenceEvaluation,
  Criterion,
  DomainSnapshot,
  LearningNode,
  NodeId,
} from "./types.js";

export function hasQualifyingEvidence(
  node: LearningNode,
  criterion: Criterion,
): boolean {
  return criterion.evidenceIds.some((evidenceId) =>
    node.evidence.some((item) => item.id === evidenceId),
  );
}

export function isEffectivelySatisfied(
  node: LearningNode,
  criterion: Criterion,
): boolean {
  if (criterion.status !== "satisfied") {
    return false;
  }
  if (!criterion.evidenceRequired) {
    return true;
  }
  return hasQualifyingEvidence(node, criterion);
}

export function evaluateNodeConvergence(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): ConvergenceEvaluation {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return {
      canClose: false,
      failures: [{ kind: "NodeNotFound", nodeId }],
    };
  }

  const failures: DomainError[] = [];

  for (const criterion of node.definitionOfDone) {
    if (!criterion.required) {
      continue;
    }
    if (criterion.status !== "satisfied") {
      failures.push({
        kind: "CriterionNotSatisfied",
        nodeId,
        criterionId: criterion.id,
      });
      continue;
    }
    if (criterion.evidenceRequired && !hasQualifyingEvidence(node, criterion)) {
      failures.push({
        kind: "MissingRequiredEvidence",
        nodeId,
        criterionId: criterion.id,
      });
    }
  }

  const unresolved = unresolvedBlockingChildIds(snapshot, nodeId);
  if (unresolved.length > 0) {
    failures.push({
      kind: "UnresolvedBlockingChildren",
      nodeId,
      unresolvedChildIds: unresolved,
    });
  }

  if (node.summary === undefined || node.summary.trim() === "") {
    failures.push({ kind: "SummaryRequired", nodeId });
  }

  return { canClose: failures.length === 0, failures };
}
