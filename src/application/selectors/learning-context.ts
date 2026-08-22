import {
  unresolvedBlockingChildIds,
  type Criterion,
  type DomainSnapshot,
  type Evidence,
  type FrontierItem,
  type LearningDepth,
  type LearningNode,
  type NodeId,
  type NodeLifecycle,
  type ProjectId,
} from "../../domain/index.js";
import { selectProjectSummary, type ProjectSummary } from "./project-summary.js";

export type LearningContextTarget =
  | { kind: "node"; projectId: ProjectId; nodeId: NodeId }
  | { kind: "project"; projectId: ProjectId };

export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LearningContextNode {
  id: NodeId;
  question: string;
  goal: string;
  targetDepth: LearningDepth;
  lifecycle: NodeLifecycle;
  parentId?: NodeId;
  parentQuestion?: string;
  ancestorPath: Array<{ id: NodeId; question: string }>;
  activeStack: Array<{ id: NodeId; question: string }>;
  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;
  unresolvedBlockingChildren: Array<{ id: NodeId; question: string }>;
}

export interface LearningContext {
  identity: LearningContextTarget;
  project: {
    id: ProjectId;
    name: string;
    source?: string;
  };
  node?: LearningContextNode;
  activeStack: Array<{ id: NodeId; question: string }>;
  conversation: ContextMessage[];
  included: {
    boundNode: boolean;
    conversation: boolean;
    parent: boolean;
    ancestorPath: boolean;
    activeStack: boolean;
    definitionOfDone: boolean;
    evidence: boolean;
    summary: boolean;
    unresolvedBlockingChildren: boolean;
    projectSummary: boolean;
    frontier: boolean;
    materializedTree: boolean;
  };
  projectSummary?: ProjectSummary;
  frontier: FrontierItem[];
  materializedTree: Array<{ id: NodeId; question: string; lifecycle: NodeLifecycle }>;
  currentFocusNodeId?: NodeId;
}

export interface ContextInspectorView {
  kind: "node" | "project";
  currentQuestion?: string;
  parentQuestion?: string;
  learningPath: string[];
  completionRequirements: string[];
  evidence: string[];
  conversationPreview: string[];
  projectName?: string;
  projectStatus?: string;
  frontierQuestions: string[];
}

export function selectLearningContext(
  snapshot: DomainSnapshot,
  identity: LearningContextTarget,
  conversation: ContextMessage[] = [],
): LearningContext {
  if (identity.kind === "project") {
    return selectProjectLearningContext(snapshot, identity, conversation);
  }
  return selectNodeLearningContext(snapshot, identity, conversation);
}

export function selectContextInspectorView(
  context: LearningContext,
): ContextInspectorView {
  if (context.identity.kind === "project") {
    return {
      kind: "project",
      projectName: context.project.name,
      projectStatus: context.projectSummary
        ? `${Math.round(context.projectSummary.completionLevel * 100)}%`
        : undefined,
      learningPath: context.activeStack.map((item) => item.question),
      currentQuestion: context.currentFocusNodeId
        ? context.materializedTree.find((node) => node.id === context.currentFocusNodeId)
            ?.question
        : undefined,
      completionRequirements: [],
      evidence: [],
      conversationPreview: context.conversation.map((message) => message.content),
      frontierQuestions: context.frontier.map((item) => item.question),
    };
  }

  const node = context.node;
  return {
    kind: "node",
    currentQuestion: node?.question,
    parentQuestion: node?.parentQuestion,
    learningPath: node?.ancestorPath.map((item) => item.question) ?? [],
    completionRequirements: node?.definitionOfDone.map((item) => item.description) ?? [],
    evidence: node?.evidence.map((item) => item.reference) ?? [],
    conversationPreview: context.conversation.map((message) => message.content),
    frontierQuestions: [],
  };
}

function selectProjectLearningContext(
  snapshot: DomainSnapshot,
  identity: Extract<LearningContextTarget, { kind: "project" }>,
  conversation: ContextMessage[],
): LearningContext {
  const stack = snapshot.pass.activeStack.flatMap((nodeId) => {
    const node = snapshot.nodes[nodeId];
    return node ? [{ id: node.id, question: node.question }] : [];
  });
  return {
    identity,
    project: {
      id: snapshot.project.id,
      name: snapshot.project.name,
      source: snapshot.project.source,
    },
    conversation: conversation.map((message) => ({ ...message })),
    included: {
      boundNode: false,
      conversation: true,
      parent: false,
      ancestorPath: false,
      activeStack: true,
      definitionOfDone: false,
      evidence: false,
      summary: false,
      unresolvedBlockingChildren: false,
      projectSummary: true,
      frontier: true,
      materializedTree: true,
    },
    activeStack: stack,
    projectSummary: selectProjectSummary(snapshot),
    frontier: snapshot.pass.frontier.map((item) => ({ ...item })),
    materializedTree: Object.values(snapshot.nodes).map((node) => ({
      id: node.id,
      question: node.question,
      lifecycle: node.lifecycle,
    })),
    currentFocusNodeId: snapshot.pass.currentFocusNodeId,
  };
}

function selectNodeLearningContext(
  snapshot: DomainSnapshot,
  identity: Extract<LearningContextTarget, { kind: "node" }>,
  conversation: ContextMessage[],
): LearningContext {
  const node = snapshot.nodes[identity.nodeId];
  const ancestorPath = node ? collectAncestorPath(snapshot, node.id) : [];
  const parent = node?.parentId ? snapshot.nodes[node.parentId] : undefined;
  const unresolved = node
    ? unresolvedBlockingChildIds(snapshot, node.id).flatMap((childId) => {
        const child = snapshot.nodes[childId];
        return child ? [{ id: child.id, question: child.question }] : [];
      })
    : [];
  const activeStack = snapshot.pass.activeStack.flatMap((nodeId) => {
    const stacked = snapshot.nodes[nodeId];
    return stacked ? [{ id: stacked.id, question: stacked.question }] : [];
  });

  return {
    identity,
    project: {
      id: snapshot.project.id,
      name: snapshot.project.name,
      source: snapshot.project.source,
    },
    node: node
      ? {
          id: node.id,
          question: node.question,
          goal: node.goal,
          targetDepth: node.targetDepth,
          lifecycle: node.lifecycle,
          parentId: node.parentId,
          parentQuestion: parent?.question,
          ancestorPath,
          activeStack,
          definitionOfDone: node.definitionOfDone.map((criterion) => ({
            ...criterion,
            evidenceIds: [...criterion.evidenceIds],
          })),
          evidence: node.evidence.map((item) => ({ ...item })),
          summary: node.summary,
          unresolvedBlockingChildren: unresolved,
        }
      : undefined,
    activeStack,
    conversation: conversation.map((message) => ({ ...message })),
    included: {
      boundNode: node !== undefined,
      conversation: true,
      parent: parent !== undefined,
      ancestorPath: ancestorPath.length > 0,
      activeStack: true,
      definitionOfDone: true,
      evidence: true,
      summary: node?.summary !== undefined,
      unresolvedBlockingChildren: true,
      projectSummary: true,
      frontier: false,
      materializedTree: false,
    },
    projectSummary: selectProjectSummary(snapshot),
    frontier: [],
    materializedTree: [],
    currentFocusNodeId: snapshot.pass.currentFocusNodeId,
  };
}

function collectAncestorPath(
  snapshot: DomainSnapshot,
  nodeId: NodeId,
): Array<{ id: NodeId; question: string }> {
  const path: Array<{ id: NodeId; question: string }> = [];
  const seen = new Set<NodeId>();
  let currentId: NodeId | undefined = nodeId;
  while (currentId !== undefined && !seen.has(currentId)) {
    seen.add(currentId);
    const node: LearningNode | undefined = snapshot.nodes[currentId];
    if (!node) {
      break;
    }
    path.unshift({ id: node.id, question: node.question });
    currentId = node.parentId;
  }
  return path;
}

export function contextExcludesSiblingConversations(
  context: LearningContext,
  siblingMessages: ContextMessage[],
): boolean {
  if (siblingMessages.length === 0) {
    return true;
  }
  const included = new Set(context.conversation.map((message) => message.content));
  return siblingMessages.every((message) => !included.has(message.content));
}
