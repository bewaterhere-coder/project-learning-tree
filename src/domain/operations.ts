import { isBlocked, unresolvedBlockingChildIds } from "./blocking.js";
import { evaluateNodeConvergence } from "./convergence.js";
import type { DomainError } from "./errors.js";
import { canBecomeActive } from "./lifecycle.js";
import type { Ports } from "./ports.js";
import { cloneSnapshot, putNode, requireNode } from "./snapshot.js";
import {
  currentStackLeaf,
  pathFromRoot,
  validateActiveBijection,
  validateActiveStack,
} from "./stack.js";
import {
  isProjectRootNode,
  learningPathFromStructural,
} from "./project-root.js";
import {
  CORE_QUESTION_LIMIT,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type ActivateBlockingChild,
  type ActivateNode,
  type AddCoreQuestion,
  type AddCriterion,
  type AddEvidence,
  type CloseNode,
  type ConvergenceEvaluation,
  type CreateBlockingChild,
  type CreateChild,
  type CreateProject,
  type DeclareCriterionSatisfied,
  type DomainEvent,
  type DomainResult,
  type DomainSnapshot,
  type EnsureProjectRoot,
  type EvaluateConvergence,
  type FocusNode,
  type LearningNode,
  type LinkEvidenceToCriterion,
  type MarkChildBlocking,
  type MoveCandidateToFrontier,
  type NodeId,
  type ParkNode,
  type PromoteFrontierItem,
  type ReopenNode,
  type ResumeNode,
  type SetNodeSummary,
  type UnmarkChildBlocking,
  type UpdateProjectMetadata,
} from "./types.js";

function ok(
  snapshot: DomainSnapshot,
  events: DomainEvent[],
): DomainResult<DomainSnapshot> {
  const stackError = validateActiveStack(snapshot);
  if (stackError) {
    throw new Error(`Active Stack invariant violated: ${stackError.kind}`);
  }
  const bijectionError = validateActiveBijection(snapshot);
  if (bijectionError) {
    throw new Error(`Active bijection invariant violated: ${bijectionError.kind}`);
  }
  return { ok: true, snapshot, events };
}

function fail(error: DomainError): DomainResult<DomainSnapshot> {
  return { ok: false, error };
}

function applyNewStack(
  snapshot: DomainSnapshot,
  newStack: NodeId[],
): DomainSnapshot {
  const next = cloneSnapshot(snapshot);
  const incoming = new Set(newStack);
  for (const id of snapshot.pass.activeStack) {
    if (!incoming.has(id)) {
      const node = next.nodes[id];
      if (node?.lifecycle === "active") {
        next.nodes[id] = { ...node, lifecycle: "open" };
      }
    }
  }
  for (const id of newStack) {
    const node = next.nodes[id];
    if (node) {
      next.nodes[id] = { ...node, lifecycle: "active" };
    }
  }
  next.pass.activeStack = [...newStack];
  return next;
}

function createOpenNode(
  ports: Ports,
  input: {
    question: string;
    goal: string;
    targetDepth?: LearningNode["targetDepth"];
    parentId?: NodeId;
    id?: NodeId;
  },
): LearningNode {
  return {
    id: input.id ?? ports.id(),
    parentId: input.parentId,
    question: input.question,
    goal: input.goal,
    lifecycle: "open",
    targetDepth: input.targetDepth ?? "L1",
    definitionOfDone: [],
    evidence: [],
    childIds: [],
    blockingChildIds: [],
    conversationThreadId: ports.id(),
    reopenHistory: [],
  };
}

function rejectIfClosed(
  node: LearningNode,
  attempted: string,
): DomainError | undefined {
  if (node.lifecycle === "closed") {
    return {
      kind: "InvalidLifecycleTransition",
      nodeId: node.id,
      from: node.lifecycle,
      attempted,
    };
  }
  return undefined;
}

function rejectIfBlankAuthoring(
  question: string,
  goal: string,
): DomainError | undefined {
  if (question.trim() === "") {
    return { kind: "QuestionRequired" };
  }
  if (goal.trim() === "") {
    return { kind: "GoalRequired" };
  }
  return undefined;
}

function appendUnique(ids: NodeId[], id: NodeId): NodeId[] {
  return ids.includes(id) ? ids : [...ids, id];
}

function requireDirectChild(
  parent: LearningNode,
  child: LearningNode,
  parentId: NodeId,
  childId: NodeId,
): DomainError | undefined {
  if (child.parentId !== parentId || !parent.childIds.includes(childId)) {
    return { kind: "NotADirectChild", parentId, childId };
  }
  return undefined;
}

function attachChild(
  parent: LearningNode,
  childId: NodeId,
  options: { blocking: boolean },
): LearningNode {
  return {
    ...parent,
    childIds: appendUnique(parent.childIds, childId),
    blockingChildIds: options.blocking
      ? appendUnique(parent.blockingChildIds, childId)
      : [...parent.blockingChildIds],
  };
}

function ancestorsAllowActivation(
  snapshot: DomainSnapshot,
  path: NodeId[],
  targetId: NodeId,
): DomainError | undefined {
  for (const id of path) {
    if (isProjectRootNode(snapshot, id)) {
      continue;
    }
    const node = snapshot.nodes[id];
    if (!node) {
      return { kind: "NodeNotFound", nodeId: id };
    }
    if (id === targetId) {
      continue;
    }
    if (node.lifecycle === "closed" || node.lifecycle === "parked") {
      return {
        kind: "InvalidActiveStack",
        reason: `ancestor ${id} is ${node.lifecycle}`,
      };
    }
  }
  return undefined;
}

function rejectIfProjectRoot(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
  attempted: string,
): DomainError | undefined {
  if (isProjectRootNode(snapshot, nodeId)) {
    return { kind: "NotALearningQuestion", nodeId, attempted };
  }
  return undefined;
}

/** Learning questions only — Project Root never counts toward pass completion. */
function openLearningQuestionIds(snapshot: DomainSnapshot): NodeId[] {
  const rootId = snapshot.pass.projectRootNodeId;
  return Object.keys(snapshot.nodes).filter((id) => {
    if (rootId !== undefined && id === rootId) {
      return false;
    }
    const node = snapshot.nodes[id];
    return node === undefined || node.lifecycle !== "closed";
  });
}

export function createProject(
  command: CreateProject,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const name = command.name.trim();
  if (name === "") {
    return fail({ kind: "ProjectNameRequired" });
  }
  const projectId = ports.id();
  const passId = ports.id();
  const description = command.description?.trim() || undefined;
  const snapshot: DomainSnapshot = {
    project: {
      id: projectId,
      name,
      source: command.source?.trim() || undefined,
      description,
      passIds: [passId],
    },
    pass: {
      id: passId,
      projectId,
      status: "in_progress",
      rootNodeIds: [],
      activeStack: [],
      frontier: [],
    },
    nodes: {},
  };
  return ok(snapshot, [{ type: "ProjectCreated", projectId, passId }]);
}

export function ensureProjectRoot(
  snapshot: DomainSnapshot,
  ports: Ports,
  command: EnsureProjectRoot = {},
): DomainResult<DomainSnapshot> {
  const existingId = snapshot.pass.projectRootNodeId;
  if (existingId !== undefined) {
    const existing = snapshot.nodes[existingId];
    if (existing && snapshot.pass.rootNodeIds.includes(existingId)) {
      return ok(cloneSnapshot(snapshot), []);
    }
  }

  const nodeId = command.nodeId ?? ports.id();
  if (snapshot.nodes[nodeId]) {
    return fail({
      kind: "InvalidActiveStack",
      reason: "project root id already used",
    });
  }

  const rootNode = createOpenNode(ports, {
    id: nodeId,
    question: snapshot.project.name,
    goal: PROJECT_ROOT_ORIENTATION_GOAL,
  });

  const next = putNode(snapshot, rootNode);
  next.pass.projectRootNodeId = nodeId;
  if (!next.pass.rootNodeIds.includes(nodeId)) {
    next.pass.rootNodeIds = [nodeId, ...next.pass.rootNodeIds];
  }
  return ok(next, [{ type: "ProjectRootEnsured", nodeId }]);
}

export function updateProjectMetadata(
  snapshot: DomainSnapshot,
  command: UpdateProjectMetadata,
): DomainResult<DomainSnapshot> {
  const name = command.name.trim();
  if (name === "") {
    return fail({ kind: "ProjectNameRequired" });
  }
  const next = cloneSnapshot(snapshot);
  next.project.name = name;
  next.project.source =
    command.source !== undefined
      ? command.source.trim() || undefined
      : next.project.source;
  if (command.description !== undefined) {
    next.project.description = command.description.trim() || undefined;
  }
  const rootId = next.pass.projectRootNodeId;
  if (rootId !== undefined) {
    const root = next.nodes[rootId];
    if (root) {
      next.nodes[rootId] = { ...root, question: name };
    }
  }
  return ok(next, [{ type: "ProjectMetadataUpdated", projectId: next.project.id }]);
}

export function addCoreQuestion(
  snapshot: DomainSnapshot,
  command: AddCoreQuestion,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const rootId = snapshot.pass.projectRootNodeId;
  if (rootId === undefined || !snapshot.nodes[rootId]) {
    return fail({ kind: "ProjectRootRequired" });
  }
  const root = snapshot.nodes[rootId];
  if (!root) {
    return fail({ kind: "ProjectRootRequired" });
  }
  if (root.childIds.length >= CORE_QUESTION_LIMIT) {
    return fail({ kind: "CoreQuestionLimitReached", limit: CORE_QUESTION_LIMIT });
  }
  const authoringError = rejectIfBlankAuthoring(command.question, command.goal);
  if (authoringError) {
    return fail(authoringError);
  }
  const closed = rejectIfClosed(root, "add-core-question");
  if (closed) {
    return fail(closed);
  }
  const node = createOpenNode(ports, {
    question: command.question.trim(),
    goal: command.goal.trim(),
    targetDepth: command.targetDepth,
    parentId: rootId,
  });
  const next = putNode(snapshot, node);
  const liveRoot = next.nodes[rootId];
  if (!liveRoot) {
    return fail({ kind: "ProjectRootRequired" });
  }
  next.nodes[rootId] = attachChild(liveRoot, node.id, { blocking: false });
  return ok(next, [{ type: "CoreQuestionAdded", nodeId: node.id }]);
}

export function focusNode(
  snapshot: DomainSnapshot,
  command: FocusNode,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const next = cloneSnapshot(snapshot);
  next.pass.currentFocusNodeId = command.nodeId;
  return ok(next, [{ type: "NodeFocused", nodeId: command.nodeId }]);
}

export function activateNode(
  snapshot: DomainSnapshot,
  command: ActivateNode,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(snapshot, command.nodeId, "activate");
  if (rootReject) {
    return fail(rootReject);
  }
  if (!canBecomeActive(found.node.lifecycle)) {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.nodeId,
      from: found.node.lifecycle,
      attempted: "activate",
    });
  }
  const path = pathFromRoot(snapshot, command.nodeId);
  if (!path.ok) {
    return fail(path.error);
  }
  const learningPath = learningPathFromStructural(snapshot, path.path);
  if (learningPath.length === 0 || learningPath[learningPath.length - 1] !== command.nodeId) {
    return fail({
      kind: "InvalidActiveStack",
      reason: "learning path does not include target question",
    });
  }
  const ancestorError = ancestorsAllowActivation(
    snapshot,
    path.path,
    command.nodeId,
  );
  if (ancestorError) {
    return fail(ancestorError);
  }
  return ok(applyNewStack(snapshot, learningPath), [
    { type: "NodeActivated", nodeId: command.nodeId },
  ]);
}

export function activateBlockingChild(
  snapshot: DomainSnapshot,
  command: ActivateBlockingChild,
): DomainResult<DomainSnapshot> {
  const parentFound = requireNode(snapshot, command.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  const childFound = requireNode(snapshot, command.childId);
  if (!childFound.ok) {
    return fail(childFound.error);
  }
  const parentRootReject = rejectIfProjectRoot(
    snapshot,
    command.parentId,
    "activate-blocking-child",
  );
  if (parentRootReject) {
    return fail(parentRootReject);
  }
  const childRootReject = rejectIfProjectRoot(
    snapshot,
    command.childId,
    "activate-blocking-child",
  );
  if (childRootReject) {
    return fail(childRootReject);
  }
  if (currentStackLeaf(snapshot) !== command.parentId) {
    return fail({
      kind: "InvalidActiveStack",
      reason: "parent is not the current active stack leaf",
    });
  }
  if (!parentFound.node.blockingChildIds.includes(command.childId)) {
    return fail({
      kind: "InvalidActiveStack",
      reason: "child is not a blocking child of parent",
    });
  }
  if (childFound.node.lifecycle !== "open") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.childId,
      from: childFound.node.lifecycle,
      attempted: "activate-blocking-child",
    });
  }
  const next = applyNewStack(snapshot, [
    ...snapshot.pass.activeStack,
    command.childId,
  ]);
  return ok(next, [
    {
      type: "BlockingChildActivated",
      parentId: command.parentId,
      childId: command.childId,
    },
  ]);
}

export function createBlockingChild(
  snapshot: DomainSnapshot,
  command: CreateBlockingChild,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const parentFound = requireNode(snapshot, command.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  if (parentFound.node.lifecycle !== "active") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.parentId,
      from: parentFound.node.lifecycle,
      attempted: "create-blocking-child",
    });
  }
  const authoringError = rejectIfBlankAuthoring(command.question, command.goal);
  if (authoringError) {
    return fail(authoringError);
  }
  const child = createOpenNode(ports, {
    question: command.question.trim(),
    goal: command.goal.trim(),
    targetDepth: command.targetDepth,
    parentId: command.parentId,
  });
  const next = putNode(snapshot, child);
  const parent = next.nodes[command.parentId];
  if (!parent) {
    return fail({ kind: "NodeNotFound", nodeId: command.parentId });
  }
  next.nodes[command.parentId] = attachChild(parent, child.id, {
    blocking: true,
  });
  return ok(next, [
    {
      type: "BlockingChildCreated",
      parentId: command.parentId,
      childId: child.id,
    },
  ]);
}

export function createChild(
  snapshot: DomainSnapshot,
  command: CreateChild,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const parentFound = requireNode(snapshot, command.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  const closed = rejectIfClosed(parentFound.node, "create-child");
  if (closed) {
    return fail(closed);
  }
  const authoringError = rejectIfBlankAuthoring(command.question, command.goal);
  if (authoringError) {
    return fail(authoringError);
  }
  const child = createOpenNode(ports, {
    question: command.question.trim(),
    goal: command.goal.trim(),
    targetDepth: command.targetDepth,
    parentId: command.parentId,
  });
  const next = putNode(snapshot, child);
  const parent = next.nodes[command.parentId];
  if (!parent) {
    return fail({ kind: "NodeNotFound", nodeId: command.parentId });
  }
  next.nodes[command.parentId] = attachChild(parent, child.id, {
    blocking: false,
  });
  return ok(next, [
    {
      type: "ChildCreated",
      parentId: command.parentId,
      childId: child.id,
    },
  ]);
}

export function markChildBlocking(
  snapshot: DomainSnapshot,
  command: MarkChildBlocking,
): DomainResult<DomainSnapshot> {
  const parentFound = requireNode(snapshot, command.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  const childFound = requireNode(snapshot, command.childId);
  if (!childFound.ok) {
    return fail(childFound.error);
  }
  const closed = rejectIfClosed(parentFound.node, "mark-child-blocking");
  if (closed) {
    return fail(closed);
  }
  const relationship = requireDirectChild(
    parentFound.node,
    childFound.node,
    command.parentId,
    command.childId,
  );
  if (relationship) {
    return fail(relationship);
  }
  const next = cloneSnapshot(snapshot);
  const parent = next.nodes[command.parentId];
  if (!parent) {
    return fail({ kind: "NodeNotFound", nodeId: command.parentId });
  }
  next.nodes[command.parentId] = {
    ...parent,
    blockingChildIds: appendUnique(parent.blockingChildIds, command.childId),
  };
  return ok(next, [
    {
      type: "ChildMarkedBlocking",
      parentId: command.parentId,
      childId: command.childId,
    },
  ]);
}

export function unmarkChildBlocking(
  snapshot: DomainSnapshot,
  command: UnmarkChildBlocking,
): DomainResult<DomainSnapshot> {
  const parentFound = requireNode(snapshot, command.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  const childFound = requireNode(snapshot, command.childId);
  if (!childFound.ok) {
    return fail(childFound.error);
  }
  const closed = rejectIfClosed(parentFound.node, "unmark-child-blocking");
  if (closed) {
    return fail(closed);
  }
  const relationship = requireDirectChild(
    parentFound.node,
    childFound.node,
    command.parentId,
    command.childId,
  );
  if (relationship) {
    return fail(relationship);
  }
  const next = cloneSnapshot(snapshot);
  const parent = next.nodes[command.parentId];
  if (!parent) {
    return fail({ kind: "NodeNotFound", nodeId: command.parentId });
  }
  next.nodes[command.parentId] = {
    ...parent,
    blockingChildIds: parent.blockingChildIds.filter(
      (id) => id !== command.childId,
    ),
  };
  return ok(next, [
    {
      type: "ChildUnmarkedBlocking",
      parentId: command.parentId,
      childId: command.childId,
    },
  ]);
}

export function moveCandidateToFrontier(
  snapshot: DomainSnapshot,
  command: MoveCandidateToFrontier,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.sourceNodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const item = {
    id: ports.id(),
    question: command.question,
    sourceNodeId: command.sourceNodeId,
    reason: command.reason,
    createdAt: ports.now(),
  };
  const next = cloneSnapshot(snapshot);
  next.pass.frontier = [...next.pass.frontier, item];
  return ok(next, [
    { type: "CandidateMovedToFrontier", frontierItemId: item.id },
  ]);
}

export function promoteFrontierItem(
  snapshot: DomainSnapshot,
  command: PromoteFrontierItem,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const item = snapshot.pass.frontier.find(
    (entry) => entry.id === command.frontierItemId,
  );
  if (!item) {
    return fail({
      kind: "FrontierItemNotFound",
      frontierItemId: command.frontierItemId,
    });
  }

  const parentId =
    command.placement.kind === "root" ? undefined : command.placement.parentId;
  let parent: LearningNode | undefined;
  if (parentId !== undefined) {
    const parentFound = requireNode(snapshot, parentId);
    if (!parentFound.ok) {
      return fail(parentFound.error);
    }
    if (parentFound.node.lifecycle === "closed") {
      return fail({
        kind: "InvalidLifecycleTransition",
        nodeId: parentId,
        from: parentFound.node.lifecycle,
        attempted: "promote-frontier-item",
      });
    }
    parent = parentFound.node;
  }

  const node = createOpenNode(ports, {
    question: item.question,
    goal: item.question,
    parentId,
  });
  const next = putNode(snapshot, node);
  next.pass.frontier = next.pass.frontier.filter(
    (entry) => entry.id !== command.frontierItemId,
  );

  if (parent && parentId) {
    const liveParent = next.nodes[parentId];
    if (!liveParent) {
      return fail({ kind: "NodeNotFound", nodeId: parentId });
    }
    next.nodes[parentId] = attachChild(liveParent, node.id, {
      blocking: command.placement.kind === "blockingChild",
    });
  } else {
    const projectRootId = next.pass.projectRootNodeId;
    if (projectRootId !== undefined && next.nodes[projectRootId]) {
      const liveRoot = next.nodes[projectRootId];
      next.nodes[node.id] = { ...node, parentId: projectRootId };
      next.nodes[projectRootId] = attachChild(liveRoot, node.id, {
        blocking: false,
      });
    } else {
      next.pass.rootNodeIds = [...next.pass.rootNodeIds, node.id];
    }
  }

  return ok(next, [
    {
      type: "FrontierItemPromoted",
      frontierItemId: command.frontierItemId,
      nodeId: node.id,
    },
  ]);
}

export function parkNode(
  snapshot: DomainSnapshot,
  command: ParkNode,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(snapshot, command.nodeId, "park");
  if (rootReject) {
    return fail(rootReject);
  }
  if (found.node.lifecycle !== "active") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.nodeId,
      from: found.node.lifecycle,
      attempted: "park",
    });
  }
  if (currentStackLeaf(snapshot) !== command.nodeId) {
    return fail({ kind: "NotActiveStackLeaf", nodeId: command.nodeId });
  }
  const next = cloneSnapshot(snapshot);
  const node = next.nodes[command.nodeId];
  if (!node) {
    return fail({ kind: "NodeNotFound", nodeId: command.nodeId });
  }
  next.nodes[command.nodeId] = { ...node, lifecycle: "parked" };
  next.pass.activeStack = next.pass.activeStack.slice(0, -1);
  return ok(next, [{ type: "NodeParked", nodeId: command.nodeId }]);
}

export function resumeNode(
  snapshot: DomainSnapshot,
  command: ResumeNode,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(snapshot, command.nodeId, "resume");
  if (rootReject) {
    return fail(rootReject);
  }
  if (found.node.lifecycle !== "parked") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.nodeId,
      from: found.node.lifecycle,
      attempted: "resume",
    });
  }
  const path = pathFromRoot(snapshot, command.nodeId);
  if (!path.ok) {
    return fail(path.error);
  }
  const learningPath = learningPathFromStructural(snapshot, path.path);
  if (learningPath.length === 0 || learningPath[learningPath.length - 1] !== command.nodeId) {
    return fail({
      kind: "InvalidActiveStack",
      reason: "learning path does not include target question",
    });
  }
  const ancestorError = ancestorsAllowActivation(
    snapshot,
    path.path,
    command.nodeId,
  );
  if (ancestorError) {
    return fail(ancestorError);
  }
  return ok(applyNewStack(snapshot, learningPath), [
    { type: "NodeResumed", nodeId: command.nodeId },
  ]);
}

export function addCriterion(
  snapshot: DomainSnapshot,
  command: AddCriterion,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(
    snapshot,
    command.nodeId,
    "add-criterion",
  );
  if (rootReject) {
    return fail(rootReject);
  }
  const closed = rejectIfClosed(found.node, "add-criterion");
  if (closed) {
    return fail(closed);
  }
  const criterion = {
    id: ports.id(),
    description: command.description,
    required: command.required,
    status: "unsatisfied" as const,
    evidenceIds: [],
    evidenceRequired: command.evidenceRequired,
    notes: command.notes,
  };
  const next = putNode(snapshot, {
    ...found.node,
    definitionOfDone: [...found.node.definitionOfDone, criterion],
  });
  return ok(next, [
    {
      type: "CriterionAdded",
      nodeId: command.nodeId,
      criterionId: criterion.id,
    },
  ]);
}

export function addEvidence(
  snapshot: DomainSnapshot,
  command: AddEvidence,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const closed = rejectIfClosed(found.node, "add-evidence");
  if (closed) {
    return fail(closed);
  }
  const evidence = {
    id: ports.id(),
    type: command.type,
    reference: command.reference,
    note: command.note,
  };
  const next = putNode(snapshot, {
    ...found.node,
    evidence: [...found.node.evidence, evidence],
  });
  return ok(next, [
    { type: "EvidenceAdded", nodeId: command.nodeId, evidenceId: evidence.id },
  ]);
}

export function linkEvidenceToCriterion(
  snapshot: DomainSnapshot,
  command: LinkEvidenceToCriterion,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const closed = rejectIfClosed(found.node, "link-evidence");
  if (closed) {
    return fail(closed);
  }
  if (!found.node.evidence.some((item) => item.id === command.evidenceId)) {
    const elsewhere = Object.values(snapshot.nodes).some((node) =>
      node.evidence.some((item) => item.id === command.evidenceId),
    );
    return fail(
      elsewhere
        ? {
            kind: "EvidenceNotOnNode",
            nodeId: command.nodeId,
            evidenceId: command.evidenceId,
          }
        : { kind: "EvidenceNotFound", evidenceId: command.evidenceId },
    );
  }
  const criterion = found.node.definitionOfDone.find(
    (item) => item.id === command.criterionId,
  );
  if (!criterion) {
    return fail({
      kind: "CriterionNotFound",
      nodeId: command.nodeId,
      criterionId: command.criterionId,
    });
  }
  const next = putNode(snapshot, {
    ...found.node,
    definitionOfDone: found.node.definitionOfDone.map((item) =>
      item.id === command.criterionId
        ? { ...item, evidenceIds: [...item.evidenceIds, command.evidenceId] }
        : item,
    ),
  });
  return ok(next, [
    {
      type: "EvidenceLinked",
      nodeId: command.nodeId,
      criterionId: command.criterionId,
      evidenceId: command.evidenceId,
    },
  ]);
}

export function declareCriterionSatisfied(
  snapshot: DomainSnapshot,
  command: DeclareCriterionSatisfied,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const closed = rejectIfClosed(found.node, "declare-criterion-satisfied");
  if (closed) {
    return fail(closed);
  }
  if (
    !found.node.definitionOfDone.some((item) => item.id === command.criterionId)
  ) {
    return fail({
      kind: "CriterionNotFound",
      nodeId: command.nodeId,
      criterionId: command.criterionId,
    });
  }
  const next = putNode(snapshot, {
    ...found.node,
    definitionOfDone: found.node.definitionOfDone.map((item) =>
      item.id === command.criterionId
        ? { ...item, status: "satisfied" }
        : item,
    ),
  });
  return ok(next, [
    {
      type: "CriterionDeclaredSatisfied",
      nodeId: command.nodeId,
      criterionId: command.criterionId,
    },
  ]);
}

export function setNodeSummary(
  snapshot: DomainSnapshot,
  command: SetNodeSummary,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(
    snapshot,
    command.nodeId,
    "set-summary",
  );
  if (rootReject) {
    return fail(rootReject);
  }
  const closed = rejectIfClosed(found.node, "set-summary");
  if (closed) {
    return fail(closed);
  }
  const next = putNode(snapshot, {
    ...found.node,
    summary: command.summary,
  });
  return ok(next, [{ type: "SummarySet", nodeId: command.nodeId }]);
}

export function evaluateConvergence(
  snapshot: DomainSnapshot,
  command: EvaluateConvergence,
):
  | { ok: true; evaluation: ConvergenceEvaluation }
  | { ok: false; error: DomainError } {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return { ok: false, error: found.error };
  }
  const rootReject = rejectIfProjectRoot(
    snapshot,
    command.nodeId,
    "evaluate-convergence",
  );
  if (rootReject) {
    return { ok: false, error: rootReject };
  }
  return {
    ok: true,
    evaluation: evaluateNodeConvergence(snapshot, command.nodeId),
  };
}

export function closeNode(
  snapshot: DomainSnapshot,
  command: CloseNode,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(snapshot, command.nodeId, "close");
  if (rootReject) {
    return fail(rootReject);
  }
  // Completion is 未完成 → 已完成: allow close from open/active/parked when
  // convergence holds. Do not require Active Stack membership (no activateNode).
  if (found.node.lifecycle === "closed") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.nodeId,
      from: found.node.lifecycle,
      attempted: "close",
    });
  }
  const evaluation = evaluateNodeConvergence(snapshot, command.nodeId);
  if (!evaluation.canClose) {
    const first = evaluation.failures[0];
    return fail(first ?? { kind: "SummaryRequired", nodeId: command.nodeId });
  }
  const next = cloneSnapshot(snapshot);
  const node = next.nodes[command.nodeId];
  if (!node) {
    return fail({ kind: "NodeNotFound", nodeId: command.nodeId });
  }
  next.nodes[command.nodeId] = { ...node, lifecycle: "closed" };
  const stackIndex = snapshot.pass.activeStack.indexOf(command.nodeId);
  if (stackIndex >= 0) {
    // If the completed node was on the active stack, drop it and any deeper
    // stack members. Do not rewrite unrelated branches (no applyNewStack).
    const removed = next.pass.activeStack.slice(stackIndex + 1);
    next.pass.activeStack = next.pass.activeStack.slice(0, stackIndex);
    for (const id of removed) {
      const stacked = next.nodes[id];
      if (stacked?.lifecycle === "active") {
        next.nodes[id] = { ...stacked, lifecycle: "open" };
      }
    }
  }
  return ok(next, [{ type: "NodeClosed", nodeId: command.nodeId }]);
}

export function reopenNode(
  snapshot: DomainSnapshot,
  command: ReopenNode,
  ports: Ports,
): DomainResult<DomainSnapshot> {
  const found = requireNode(snapshot, command.nodeId);
  if (!found.ok) {
    return fail(found.error);
  }
  const rootReject = rejectIfProjectRoot(snapshot, command.nodeId, "reopen");
  if (rootReject) {
    return fail(rootReject);
  }
  if (found.node.lifecycle !== "closed") {
    return fail({
      kind: "InvalidLifecycleTransition",
      nodeId: command.nodeId,
      from: found.node.lifecycle,
      attempted: "reopen",
    });
  }
  if (command.reason.trim() === "") {
    return fail({ kind: "ReopenReasonRequired", nodeId: command.nodeId });
  }
  const reopenEvent = {
    id: ports.id(),
    reason: command.reason,
    reopenedAt: ports.now(),
  };
  const next = putNode(snapshot, {
    ...found.node,
    lifecycle: "open",
    reopenHistory: [...found.node.reopenHistory, reopenEvent],
  });
  if (next.pass.status === "completed") {
    next.pass.status = "in_progress";
  }
  return ok(next, [
    {
      type: "NodeReopened",
      nodeId: command.nodeId,
      reopenEventId: reopenEvent.id,
    },
  ]);
}

export function returnToParent(
  snapshot: DomainSnapshot,
): DomainResult<DomainSnapshot> {
  const focusId = snapshot.pass.currentFocusNodeId;
  if (focusId === undefined) {
    return fail({
      kind: "CannotReturnToParent",
      reason: "no current focus",
    });
  }
  const found = requireNode(snapshot, focusId);
  if (!found.ok) {
    return fail(found.error);
  }
  if (found.node.parentId === undefined) {
    return fail({
      kind: "CannotReturnToParent",
      reason: "focused node is a root",
    });
  }
  const parentFound = requireNode(snapshot, found.node.parentId);
  if (!parentFound.ok) {
    return fail(parentFound.error);
  }
  const next = cloneSnapshot(snapshot);
  next.pass.currentFocusNodeId = found.node.parentId;
  return ok(next, [{ type: "ReturnedToParent", parentId: found.node.parentId }]);
}

export function completePass(
  snapshot: DomainSnapshot,
): DomainResult<DomainSnapshot> {
  if (snapshot.pass.status === "completed") {
    return fail({ kind: "PassNotCompletable", reason: "pass already completed" });
  }
  if (snapshot.pass.activeStack.length > 0) {
    return fail({
      kind: "PassNotCompletable",
      reason: "active stack is not empty",
    });
  }
  const openQuestions = openLearningQuestionIds(snapshot);
  if (openQuestions.length > 0) {
    return fail({
      kind: "PassNotCompletable",
      reason: "not all root nodes are closed",
    });
  }
  const next = cloneSnapshot(snapshot);
  next.pass.status = "completed";
  return ok(next, [{ type: "PassCompleted", passId: snapshot.pass.id }]);
}

export { isBlocked, unresolvedBlockingChildIds };
