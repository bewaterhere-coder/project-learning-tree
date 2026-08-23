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

function deepCloneSnapshot(snapshot: DomainSnapshot): DomainSnapshot {
  return {
    project: {
      ...snapshot.project,
      passIds: [...snapshot.project.passIds],
    },
    pass: {
      ...snapshot.pass,
      rootNodeIds: [...snapshot.pass.rootNodeIds],
      activeStack: [...snapshot.pass.activeStack],
      frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
    },
    nodes: Object.fromEntries(
      Object.entries(snapshot.nodes).map(([id, node]) => [
        id,
        {
          ...node,
          childIds: [...node.childIds],
          blockingChildIds: [...node.blockingChildIds],
          definitionOfDone: node.definitionOfDone.map((criterion) => ({
            ...criterion,
            evidenceIds: [...criterion.evidenceIds],
          })),
          evidence: node.evidence.map((item) => ({ ...item })),
          reopenHistory: node.reopenHistory.map((event) => ({ ...event })),
        },
      ]),
    ),
  };
}

function scrubProjectRootFromLearningState(
  snapshot: DomainSnapshot,
  rootId: NodeId,
): boolean {
  const beforeStack = snapshot.pass.activeStack.length;
  snapshot.pass.activeStack = snapshot.pass.activeStack.filter(
    (id) => id !== rootId,
  );
  let changed = snapshot.pass.activeStack.length !== beforeStack;
  if (snapshot.pass.currentFocusNodeId === rootId) {
    snapshot.pass.currentFocusNodeId =
      snapshot.pass.activeStack[snapshot.pass.activeStack.length - 1] ??
      snapshot.nodes[rootId]?.childIds[0];
    changed = true;
  }
  const root = snapshot.nodes[rootId];
  if (root?.lifecycle === "active") {
    snapshot.nodes[rootId] = { ...root, lifecycle: "open" };
    changed = true;
  }
  return changed;
}

/**
 * Idempotent hierarchy migration: flat Questions → sole Project Root.
 * Does not touch layout/preferences.
 */
export function migrateSnapshotHierarchy(
  snapshot: DomainSnapshot,
): HierarchyMigrationResult {
  const existingId = snapshot.pass.projectRootNodeId;
  const hasValidRoot =
    existingId !== undefined &&
    snapshot.nodes[existingId] !== undefined &&
    snapshot.pass.rootNodeIds.length === 1 &&
    snapshot.pass.rootNodeIds[0] === existingId;

  if (hasValidRoot && existingId !== undefined) {
    const next = deepCloneSnapshot(snapshot);
    const changed = scrubProjectRootFromLearningState(next, existingId);
    return changed
      ? { snapshot: next, migrated: true }
      : { snapshot, migrated: false };
  }

  // Flat or stale pointer: treat current rootNodeIds (minus broken pointer) as questions.
  const questionIds = snapshot.pass.rootNodeIds.filter(
    (id) =>
      id !== existingId &&
      snapshot.nodes[id] !== undefined &&
      snapshot.nodes[id]?.parentId === undefined,
  );

  // Also collect children of a broken prior root if they were still attached.
  if (
    existingId !== undefined &&
    snapshot.nodes[existingId] &&
    !hasValidRoot
  ) {
    for (const childId of snapshot.nodes[existingId]?.childIds ?? []) {
      if (
        snapshot.nodes[childId] &&
        !questionIds.includes(childId) &&
        childId !== existingId
      ) {
        questionIds.push(childId);
      }
    }
  }

  if (questionIds.length === 0 && existingId === undefined) {
    return { snapshot, migrated: false };
  }

  const rootId = migratedProjectRootId(snapshot.project.id);
  if (snapshot.nodes[rootId] && existingId !== rootId) {
    // Collision with a learning question using the reserved id — do not destroy it.
    return { snapshot, migrated: false };
  }

  const next = deepCloneSnapshot(snapshot);

  // Remove broken prior root node when it is not the stable migration id.
  if (
    existingId !== undefined &&
    existingId !== rootId &&
    next.nodes[existingId]
  ) {
    delete next.nodes[existingId];
  }

  next.nodes[rootId] = {
    id: rootId,
    question: snapshot.project.name,
    goal: PROJECT_ROOT_ORIENTATION_GOAL,
    lifecycle: "open",
    targetDepth: "L1",
    definitionOfDone: [],
    evidence: [],
    childIds: [...questionIds],
    blockingChildIds: [],
    conversationThreadId: `${rootId}:thread`,
    reopenHistory: [],
  };

  for (const childId of questionIds) {
    const child = next.nodes[childId];
    if (!child) {
      continue;
    }
    next.nodes[childId] = {
      ...child,
      parentId: rootId,
    };
  }

  next.pass.rootNodeIds = [rootId];
  next.pass.projectRootNodeId = rootId;
  next.pass.activeStack = next.pass.activeStack.filter(
    (id) => id !== rootId && id !== existingId && next.nodes[id] !== undefined,
  );
  scrubProjectRootFromLearningState(next, rootId);

  return { snapshot: next, migrated: true };
}

export type { NodeId };
