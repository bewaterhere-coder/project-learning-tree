import type { DomainSnapshot, NodeId } from "../../domain/index.js";

export interface AuthoringAvailability {
  canCreateChild: boolean;
  canCreateBlockingChild: boolean;
  canChangeBlockingRelationship: boolean;
}

export interface ChildDraftValidation {
  questionError?: "empty";
  goalError?: "empty";
  ready: boolean;
}

export function selectAuthoringAvailability(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): AuthoringAvailability {
  const node = snapshot.nodes[nodeId];
  if (!node) {
    return {
      canCreateChild: false,
      canCreateBlockingChild: false,
      canChangeBlockingRelationship: false,
    };
  }
  return {
    canCreateChild: node.lifecycle !== "closed",
    canCreateBlockingChild: node.lifecycle === "active",
    canChangeBlockingRelationship: node.lifecycle !== "closed",
  };
}

export function validateChildDraft(draft: {
  question: string;
  goal: string;
}): ChildDraftValidation {
  const questionError = draft.question.trim() === "" ? "empty" : undefined;
  const goalError = draft.goal.trim() === "" ? "empty" : undefined;
  return {
    questionError,
    goalError,
    ready: questionError === undefined && goalError === undefined,
  };
}
