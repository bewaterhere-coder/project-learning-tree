import {
  migratedProjectRootId,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type DomainSnapshot,
  type NodeId,
} from "../domain/index.js";

export interface HierarchyMigrationResult {
  snapshot: DomainSnapshot;
  migrated: boolean;
}

/**
 * Idempotent hierarchy migration for legacy flat-root snapshots.
 * Does not touch layout/preferences.
 */
export function migrateSnapshotHierarchy(
  snapshot: DomainSnapshot,
): HierarchyMigrationResult {
  const existingId = snapshot.pass.projectRootNodeId;
  if (
    existingId !== undefined &&
    snapshot.pass.rootNodeIds.includes(existingId) &&
    snapshot.nodes[existingId] !== undefined
  ) {
    return { snapshot, migrated: false };
  }

  if (snapshot.pass.rootNodeIds.length === 0) {
    return { snapshot, migrated: false };
  }

  const rootId = migratedProjectRootId(snapshot.project.id);
  if (snapshot.nodes[rootId]) {
    return { snapshot, migrated: false };
  }

  const formerRoots = [...snapshot.pass.rootNodeIds];
  const nodes: DomainSnapshot["nodes"] = {
    ...Object.fromEntries(
      Object.entries(snapshot.nodes).map(([id, node]) => [id, { ...node }]),
    ),
    [rootId]: {
      id: rootId,
      question: snapshot.project.name,
      goal: PROJECT_ROOT_ORIENTATION_GOAL,
      lifecycle: "open",
      targetDepth: "L1",
      definitionOfDone: [],
      evidence: [],
      childIds: [...formerRoots],
      blockingChildIds: [],
      conversationThreadId: `${rootId}:thread`,
      reopenHistory: [],
    },
  };

  for (const childId of formerRoots) {
    const child = nodes[childId];
    if (!child) {
      continue;
    }
    nodes[childId] = {
      ...child,
      parentId: rootId,
      childIds: [...child.childIds],
      blockingChildIds: [...child.blockingChildIds],
      definitionOfDone: child.definitionOfDone.map((criterion) => ({
        ...criterion,
        evidenceIds: [...criterion.evidenceIds],
      })),
      evidence: child.evidence.map((item) => ({ ...item })),
      reopenHistory: child.reopenHistory.map((event) => ({ ...event })),
    };
  }

  return {
    migrated: true,
    snapshot: {
      project: {
        ...snapshot.project,
        passIds: [...snapshot.project.passIds],
      },
      pass: {
        ...snapshot.pass,
        rootNodeIds: [rootId],
        projectRootNodeId: rootId,
        activeStack: [...snapshot.pass.activeStack],
        frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
      },
      nodes,
    },
  };
}

export type { NodeId };
