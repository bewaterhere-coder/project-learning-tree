import type {
  CriterionId,
  EvidenceId,
  FrontierItemId,
  NodeId,
  NodeLifecycle,
} from "./types.js";

export type DomainError =
  | {
      kind: "InvalidLifecycleTransition";
      nodeId: NodeId;
      from: NodeLifecycle;
      attempted: string;
    }
  | { kind: "InvalidActiveStack"; reason: string }
  | { kind: "NodeNotFound"; nodeId: NodeId }
  | { kind: "CriterionNotSatisfied"; nodeId: NodeId; criterionId: CriterionId }
  | { kind: "MissingRequiredEvidence"; nodeId: NodeId; criterionId: CriterionId }
  | {
      kind: "UnresolvedBlockingChildren";
      nodeId: NodeId;
      unresolvedChildIds: NodeId[];
    }
  | { kind: "ReopenReasonRequired"; nodeId: NodeId }
  | { kind: "FrontierItemNotFound"; frontierItemId: FrontierItemId }
  | { kind: "SummaryRequired"; nodeId: NodeId }
  | { kind: "CoreQuestionLimitReached"; limit: 5 }
  | { kind: "EvidenceNotFound"; evidenceId: EvidenceId }
  | { kind: "EvidenceNotOnNode"; nodeId: NodeId; evidenceId: EvidenceId }
  | { kind: "PassNotCompletable"; reason: string }
  | { kind: "NotActiveStackLeaf"; nodeId: NodeId }
  | { kind: "CannotReturnToParent"; reason: string }
  | { kind: "CriterionNotFound"; nodeId: NodeId; criterionId: CriterionId }
  | { kind: "QuestionRequired" }
  | { kind: "GoalRequired" }
  | { kind: "ProjectNameRequired" }
  | { kind: "ProjectRootRequired" }
  | {
      kind: "ProjectRootChildrenOpen";
      nodeId: NodeId;
      openChildIds: NodeId[];
    }
  | { kind: "NotADirectChild"; parentId: NodeId; childId: NodeId };
