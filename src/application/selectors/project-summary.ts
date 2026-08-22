import {
  unresolvedBlockingChildIds,
  type DomainSnapshot,
  type NodeId,
  type ProjectId,
} from "../../domain/index.js";

export interface ProjectSummary {
  projectId: ProjectId;
  name: string;
  completionLevel: number;
  activeQuestion?: string;
  isBlocked: boolean;
  unresolvedBlockerCount: number;
}

export function selectProjectSummary(snapshot: DomainSnapshot): ProjectSummary {
  const nodes = Object.values(snapshot.nodes);
  const total = nodes.length;
  const closed = nodes.filter((node) => node.lifecycle === "closed").length;
  const completionLevel = total === 0 ? 0 : closed / total;

  const blockerIds = new Set<NodeId>();
  let isBlocked = false;
  for (const node of nodes) {
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
    completionLevel,
    activeQuestion,
    isBlocked,
    unresolvedBlockerCount: blockerIds.size,
  };
}
