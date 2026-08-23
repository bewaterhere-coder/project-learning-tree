import type { DomainError } from "./errors.js";
import { isProjectRootNode } from "./project-root.js";
import type { DomainSnapshot, LearningNode, NodeId } from "./types.js";

export function pathFromRoot(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): { ok: true; path: NodeId[] } | { ok: false; error: DomainError } {
  const path: NodeId[] = [];
  const seen = new Set<NodeId>();
  let current: NodeId | undefined = nodeId;

  while (current !== undefined) {
    if (seen.has(current)) {
      return {
        ok: false,
        error: { kind: "InvalidActiveStack", reason: "cycle in parent chain" },
      };
    }
    seen.add(current);
    const node: LearningNode | undefined = snapshot.nodes[current];
    if (!node) {
      return { ok: false, error: { kind: "NodeNotFound", nodeId: current } };
    }
    path.unshift(current);
    current = node.parentId;
  }

  const rootId = path[0];
  if (rootId === undefined || !snapshot.pass.rootNodeIds.includes(rootId)) {
    return {
      ok: false,
      error: {
        kind: "InvalidActiveStack",
        reason: "path does not start at a pass root",
      },
    };
  }

  for (let index = 1; index < path.length; index += 1) {
    const childId = path[index];
    const parentId = path[index - 1];
    if (childId === undefined || parentId === undefined) {
      return {
        ok: false,
        error: { kind: "InvalidActiveStack", reason: "incomplete path" },
      };
    }
    const child = snapshot.nodes[childId];
    if (child?.parentId !== parentId) {
      return {
        ok: false,
        error: {
          kind: "InvalidActiveStack",
          reason: "path is not a parent-child chain",
        },
      };
    }
  }

  return { ok: true, path };
}

export function validateActiveStack(
  snapshot: DomainSnapshot,
): DomainError | undefined {
  const { activeStack } = snapshot.pass;
  if (activeStack.length === 0) {
    return undefined;
  }

  const unique = new Set(activeStack);
  if (unique.size !== activeStack.length) {
    return { kind: "InvalidActiveStack", reason: "duplicate node on stack" };
  }

  const projectRootId = snapshot.pass.projectRootNodeId;

  for (let index = 0; index < activeStack.length; index += 1) {
    const nodeId = activeStack[index];
    if (nodeId === undefined) {
      return { kind: "InvalidActiveStack", reason: "missing stack entry" };
    }
    if (isProjectRootNode(snapshot, nodeId)) {
      return {
        kind: "InvalidActiveStack",
        reason: "stack must not include project root",
      };
    }
    const node = snapshot.nodes[nodeId];
    if (!node) {
      return { kind: "NodeNotFound", nodeId };
    }
    if (node.lifecycle !== "active") {
      return {
        kind: "InvalidActiveStack",
        reason: `stack member ${nodeId} is ${node.lifecycle}, not active`,
      };
    }
    if (index > 0) {
      const parentId = activeStack[index - 1];
      if (node.parentId !== parentId) {
        return {
          kind: "InvalidActiveStack",
          reason: "stack is not a single parent-child path",
        };
      }
    }
  }

  const stackRoot = activeStack[0];
  if (stackRoot === undefined) {
    return { kind: "InvalidActiveStack", reason: "missing stack entry" };
  }

  if (projectRootId !== undefined) {
    const stackRootNode = snapshot.nodes[stackRoot];
    if (
      !stackRootNode ||
      stackRootNode.parentId !== projectRootId ||
      !snapshot.nodes[projectRootId]?.childIds.includes(stackRoot)
    ) {
      return {
        kind: "InvalidActiveStack",
        reason: "stack does not start at a top-level learning question",
      };
    }
  } else if (!snapshot.pass.rootNodeIds.includes(stackRoot)) {
    return { kind: "InvalidActiveStack", reason: "stack does not start at a root" };
  }

  return undefined;
}

export function validateActiveBijection(
  snapshot: DomainSnapshot,
): DomainError | undefined {
  const onStack = new Set(snapshot.pass.activeStack);
  for (const node of Object.values(snapshot.nodes)) {
    if (isProjectRootNode(snapshot, node.id)) {
      // Project Root is never on the Question Active Stack and must not be active.
      if (node.lifecycle === "active") {
        return {
          kind: "InvalidActiveStack",
          reason: `active bijection violated for project root ${node.id}`,
        };
      }
      continue;
    }
    const shouldBeActive = onStack.has(node.id);
    if ((node.lifecycle === "active") !== shouldBeActive) {
      return {
        kind: "InvalidActiveStack",
        reason: `active bijection violated for ${node.id}`,
      };
    }
  }
  return undefined;
}

export function currentStackLeaf(snapshot: DomainSnapshot): NodeId | undefined {
  const stack = snapshot.pass.activeStack;
  return stack[stack.length - 1];
}
