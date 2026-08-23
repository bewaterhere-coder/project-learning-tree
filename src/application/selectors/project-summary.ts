import {
  unresolvedBlockingChildIds,
  type DomainSnapshot,
  type NodeId,
  type ProjectId,
} from "../../domain/index.js";
import { selectProjectLearningProgress } from "./project-progress.js";

export interface ProjectSummary {
  projectId: ProjectId;
  name: string;
  source?: string;
  description?: string;
  completionLevel: number;
  activeQuestion?: string;
  isBlocked: boolean;
  unresolvedBlockerCount: number;
}

export function selectProjectSummary(snapshot: DomainSnapshot): ProjectSummary {
  const progress = selectProjectLearningProgress(snapshot);
  const completionLevel = progress.ratio;

  const blockerIds = new Set<NodeId>();
  let isBlocked = false;
  for (const node of Object.values(snapshot.nodes)) {
    if (snapshot.pass.projectRootNodeId === node.id) {
      continue;
    }
    const unresolved = unresolvedBlockingChildIds(snapshot, node.id);
    if (unresolved.length > 0) {
      isBlocked = true;
      for (const childId of unresolved) {
        blockerIds.add(childId);
      }
    }
  }

  const leafId = snapshot.pass.activeStack[snapshot.pass.activeStack.length - 1];
  const activeQuestion =
    leafId === undefined ? undefined : snapshot.nodes[leafId]?.question;

  return {
    projectId: snapshot.project.id,
    name: snapshot.project.name,
    source: snapshot.project.source,
    description: snapshot.project.description,
    completionLevel,
    activeQuestion,
    isBlocked,
    unresolvedBlockerCount: blockerIds.size,
  };
}
