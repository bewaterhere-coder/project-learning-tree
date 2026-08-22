import type { DomainError, DomainSnapshot } from "../domain/index.js";
import type { UiCommand } from "./commands.js";

export interface DomainErrorPresentation {
  key: string;
  params: Record<string, string | number>;
}

const CLOSE_PREREQUISITE_KINDS: ReadonlySet<DomainError["kind"]> = new Set([
  "SummaryRequired",
  "CriterionNotSatisfied",
  "MissingRequiredEvidence",
  "UnresolvedBlockingChildren",
]);

const NODE_ACTION_COMMANDS: ReadonlySet<UiCommand["type"]> = new Set([
  "closeNode",
  "activateNode",
  "parkNode",
  "resumeNode",
  "returnToParent",
]);

const AUTHORING_COMMANDS: ReadonlySet<UiCommand["type"]> = new Set([
  "createChild",
  "createBlockingChild",
  "markChildBlocking",
  "unmarkChildBlocking",
]);

const ACTIVE_STACK_REASON_KEYS: Record<string, string> = {
  "cycle in parent chain": "error.InvalidActiveStack.cycle",
  "path does not start at a pass root": "error.InvalidActiveStack.notRoot",
  "stack does not start at a root": "error.InvalidActiveStack.notRoot",
  "incomplete path": "error.InvalidActiveStack.incomplete",
  "path is not a parent-child chain": "error.InvalidActiveStack.notChain",
  "stack is not a single parent-child path": "error.InvalidActiveStack.notChain",
  "duplicate node on stack": "error.InvalidActiveStack.duplicate",
  "missing stack entry": "error.InvalidActiveStack.missing",
};

const PASS_REASON_KEYS: Record<string, string> = {
  "pass already completed": "error.PassNotCompletable.alreadyCompleted",
  "active stack is not empty": "error.PassNotCompletable.stackNotEmpty",
  "not all root nodes are closed": "error.PassNotCompletable.rootsOpen",
};

const RETURN_REASON_KEYS: Record<string, string> = {
  "no current focus": "error.CannotReturnToParent.noFocus",
  "focused node is a root": "error.CannotReturnToParent.root",
};

export function isClosePrerequisiteError(kind: DomainError["kind"]): boolean {
  return CLOSE_PREREQUISITE_KINDS.has(kind);
}

export function isAuthoringCommand(
  command?: UiCommand["type"],
): boolean {
  return command !== undefined && AUTHORING_COMMANDS.has(command);
}

export function isGlobalDomainError(
  error: DomainError,
  command?: UiCommand["type"],
): boolean {
  if (isClosePrerequisiteError(error.kind)) {
    return false;
  }
  if (command !== undefined && NODE_ACTION_COMMANDS.has(command)) {
    return false;
  }
  if (isAuthoringCommand(command)) {
    return false;
  }
  return true;
}

function criterionDescription(
  snapshot: DomainSnapshot | undefined,
  nodeId: string,
  criterionId: string,
): string {
  const criterion = snapshot?.nodes[nodeId]?.definitionOfDone.find(
    (item) => item.id === criterionId,
  );
  return criterion?.description ?? "";
}

export function presentDomainError(
  error: DomainError,
  snapshot?: DomainSnapshot,
): DomainErrorPresentation {
  switch (error.kind) {
    case "InvalidLifecycleTransition":
      return { key: "error.InvalidLifecycleTransition", params: {} };
    case "InvalidActiveStack":
      return {
        key: ACTIVE_STACK_REASON_KEYS[error.reason] ?? "error.InvalidActiveStack",
        params: {},
      };
    case "NodeNotFound":
      return { key: "error.NodeNotFound", params: {} };
    case "CriterionNotSatisfied":
      return {
        key: "error.CriterionNotSatisfied",
        params: {
          description: criterionDescription(
            snapshot,
            error.nodeId,
            error.criterionId,
          ),
        },
      };
    case "MissingRequiredEvidence":
      return {
        key: "error.MissingRequiredEvidence",
        params: {
          description: criterionDescription(
            snapshot,
            error.nodeId,
            error.criterionId,
          ),
        },
      };
    case "UnresolvedBlockingChildren":
      return {
        key: "error.UnresolvedBlockingChildren",
        params: { count: error.unresolvedChildIds.length },
      };
    case "ReopenReasonRequired":
      return { key: "error.ReopenReasonRequired", params: {} };
    case "FrontierItemNotFound":
      return { key: "error.FrontierItemNotFound", params: {} };
    case "SummaryRequired":
      return { key: "error.SummaryRequired", params: {} };
    case "CoreQuestionLimitReached":
      return {
        key: "error.CoreQuestionLimitReached",
        params: { limit: error.limit },
      };
    case "EvidenceNotFound":
      return { key: "error.EvidenceNotFound", params: {} };
    case "EvidenceNotOnNode":
      return { key: "error.EvidenceNotOnNode", params: {} };
    case "PassNotCompletable":
      return {
        key: PASS_REASON_KEYS[error.reason] ?? "error.PassNotCompletable",
        params: {},
      };
    case "NotActiveStackLeaf":
      return { key: "error.NotActiveStackLeaf", params: {} };
    case "CannotReturnToParent":
      return {
        key: RETURN_REASON_KEYS[error.reason] ?? "error.CannotReturnToParent",
        params: {},
      };
    case "CriterionNotFound":
      return { key: "error.CriterionNotFound", params: {} };
    case "QuestionRequired":
      return { key: "error.QuestionRequired", params: {} };
    case "GoalRequired":
      return { key: "error.GoalRequired", params: {} };
    case "NotADirectChild":
      return { key: "error.NotADirectChild", params: {} };
  }
}
