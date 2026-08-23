import {
  CORE_QUESTION_LIMIT,
  type DomainSnapshot,
} from "../../domain/index.js";
import { validateChildDraft, type ChildDraftValidation } from "./child-authoring.js";

export interface CoreQuestionAuthoring {
  canAdd: boolean;
  remaining: number;
  limit: typeof CORE_QUESTION_LIMIT;
  atLimit: boolean;
}

export function selectCoreQuestionAuthoring(
  snapshot: DomainSnapshot,
): CoreQuestionAuthoring {
  const rootId = snapshot.pass.projectRootNodeId;
  const used =
    rootId !== undefined
      ? (snapshot.nodes[rootId]?.childIds.length ?? 0)
      : snapshot.pass.rootNodeIds.length;
  const remaining = Math.max(0, CORE_QUESTION_LIMIT - used);
  return {
    canAdd: remaining > 0,
    remaining,
    limit: CORE_QUESTION_LIMIT,
    atLimit: remaining === 0,
  };
}

export function validateCoreQuestionDraft(draft: {
  question: string;
  goal: string;
}): ChildDraftValidation {
  return validateChildDraft(draft);
}
