import { isProjectRootNode, type DomainSnapshot } from "../../domain/index.js";

export interface ProjectLearningProgress {
  completed: number;
  total: number;
  /** 0–100 integer percent; 0 when total is 0. */
  percent: number;
  /** closed / total in [0, 1]; 0 when total is 0. */
  ratio: number;
}

/**
 * Derived project learning progress: closed learning questions / all learning questions.
 * Project Root is excluded from both numerator and denominator.
 */
export function selectProjectLearningProgress(
  snapshot: DomainSnapshot,
): ProjectLearningProgress {
  const rootId = snapshot.pass.projectRootNodeId;
  let completed = 0;
  let total = 0;
  for (const node of Object.values(snapshot.nodes)) {
    if (rootId !== undefined && node.id === rootId) {
      continue;
    }
    if (isProjectRootNode(snapshot, node.id)) {
      continue;
    }
    total += 1;
    if (node.lifecycle === "closed") {
      completed += 1;
    }
  }
  const ratio = total === 0 ? 0 : completed / total;
  return {
    completed,
    total,
    ratio,
    percent: Math.round(ratio * 100),
  };
}
