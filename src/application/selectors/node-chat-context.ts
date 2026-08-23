import type {
  DomainSnapshot,
  NodeId,
  NodeLifecycle,
  ProjectId,
} from "../../domain/index.js";
import type { LearningContextTarget } from "./learning-context.js";

export interface NodeChatProjectContext {
  id: ProjectId;
  name: string;
  source?: string;
}

export interface NodeChatNodeContext {
  id: NodeId;
  question: string;
  goal: string;
  lifecycle: NodeLifecycle;
}

export interface NodeChatParentContext {
  id: NodeId;
  question: string;
}

export interface NodeChatContext {
  project: NodeChatProjectContext;
  node?: NodeChatNodeContext;
  parentNode?: NodeChatParentContext;
}

export interface NodeChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export function selectNodeChatContext(
  snapshot: DomainSnapshot,
  identity: LearningContextTarget,
): NodeChatContext {
  if (identity.kind === "project") {
    return {
      project: {
        id: snapshot.project.id,
        name: snapshot.project.name,
        source: snapshot.project.source,
      },
    };
  }

  const node = snapshot.nodes[identity.nodeId];
  const parent = node?.parentId ? snapshot.nodes[node.parentId] : undefined;

  return {
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
          lifecycle: node.lifecycle,
        }
      : undefined,
    parentNode: parent
      ? {
          id: parent.id,
          question: parent.question,
        }
      : undefined,
  };
}

export function selectNodeChatHistory(
  messages: NodeChatHistoryMessage[],
): NodeChatHistoryMessage[] {
  return messages.map((message) => ({ ...message }));
}
