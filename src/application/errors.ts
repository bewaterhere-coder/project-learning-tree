import type { DomainError } from "../domain/index.js";

export function formatDomainError(error: DomainError): string {
  switch (error.kind) {
    case "InvalidLifecycleTransition":
      return `Cannot ${error.attempted} node ${error.nodeId} from ${error.from}.`;
    case "InvalidActiveStack":
      return `Active Stack is invalid: ${error.reason}.`;
    case "NodeNotFound":
      return `Node ${error.nodeId} was not found.`;
    case "CriterionNotSatisfied":
      return `Required criterion ${error.criterionId} on node ${error.nodeId} is not satisfied.`;
    case "MissingRequiredEvidence":
      return `Criterion ${error.criterionId} on node ${error.nodeId} is missing required evidence.`;
    case "UnresolvedBlockingChildren":
      return `Node ${error.nodeId} still has unresolved blocking children: ${error.unresolvedChildIds.join(", ")}.`;
    case "ReopenReasonRequired":
      return `Reopening node ${error.nodeId} requires a non-empty reason.`;
    case "FrontierItemNotFound":
      return `Frontier item ${error.frontierItemId} was not found.`;
    case "SummaryRequired":
      return `Node ${error.nodeId} cannot close without a summary.`;
    case "CoreQuestionLimitReached":
      return `A Learning Pass may have at most ${error.limit} core questions.`;
    case "EvidenceNotFound":
      return `Evidence ${error.evidenceId} was not found.`;
    case "EvidenceNotOnNode":
      return `Evidence ${error.evidenceId} does not belong to node ${error.nodeId}.`;
    case "PassNotCompletable":
      return `Pass cannot be completed: ${error.reason}.`;
    case "NotActiveStackLeaf":
      return `Node ${error.nodeId} is not the Active Stack leaf.`;
    case "CannotReturnToParent":
      return `Cannot return to parent: ${error.reason}.`;
    case "CriterionNotFound":
      return `Criterion ${error.criterionId} was not found on node ${error.nodeId}.`;
  }
}
