import type { DomainSnapshot, NodeId } from "../domain/index.js";

export interface HierarchyMigrationResult {
  snapshot: DomainSnapshot;
  migrated: boolean;
}

/**
 * Idempotent hierarchy migration: Project Root → flat top-level Questions.
 * Does not touch layout/preferences.
 */
export function migrateSnapshotHierarchy(
  snapshot: DomainSnapshot,
): HierarchyMigrationResult {
  const rootId = snapshot.pass.projectRootNodeId;
  if (
    rootId === undefined ||
    !snapshot.pass.rootNodeIds.includes(rootId) ||
    snapshot.nodes[rootId] === undefined
  ) {
    // Already flat (or unusable pointer): clear stale pointer if present.
    if (rootId !== undefined) {
      const cleared = {
        ...snapshot,
        pass: {
          ...snapshot.pass,
          projectRootNodeId: undefined,
          rootNodeIds: [...snapshot.pass.rootNodeIds],
          activeStack: [...snapshot.pass.activeStack],
          frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
        },
        project: {
          ...snapshot.project,
          passIds: [...snapshot.project.passIds],
        },
        nodes: Object.fromEntries(
          Object.entries(snapshot.nodes).map(([id, node]) => [id, { ...node }]),
        ),
      };
      return { snapshot: cleared, migrated: true };
    }
    return { snapshot, migrated: false };
  }

  const projectRoot = snapshot.nodes[rootId];
  if (!projectRoot) {
    return { snapshot, migrated: false };
  }

  const formerChildren = [...projectRoot.childIds];
  const nodes: DomainSnapshot["nodes"] = Object.fromEntries(
    Object.entries(snapshot.nodes)
      .filter(([id]) => id !== rootId)
      .map(([id, node]) => [id, { ...node }]),
  );

  for (const childId of formerChildren) {
    const child = nodes[childId];
    if (!child) {
      continue;
    }
    const { parentId: _removed, ...rest } = child;
    nodes[childId] = {
      ...rest,
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

  const activeStack = snapshot.pass.activeStack.filter((id) => id !== rootId);
  let currentFocusNodeId = snapshot.pass.currentFocusNodeId;
  if (currentFocusNodeId === rootId) {
    currentFocusNodeId = formerChildren[0] ?? activeStack[activeStack.length - 1];
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
        rootNodeIds: formerChildren,
        projectRootNodeId: undefined,
        activeStack,
        currentFocusNodeId,
        frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
      },
      nodes,
    },
  };
}

export type { NodeId };
