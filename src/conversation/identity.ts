import type { NodeId, ProjectId } from "../application/index.js";

export type ConversationIdentity =
  | {
      kind: "node";
      projectId: ProjectId;
      nodeId: NodeId;
    }
  | {
      kind: "project";
      projectId: ProjectId;
    };

export function conversationKey(identity: ConversationIdentity): string {
  return identity.kind === "node"
    ? `node:${identity.projectId}:${identity.nodeId}`
    : `project:${identity.projectId}`;
}

export function identitiesEqual(
  left: ConversationIdentity,
  right: ConversationIdentity,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "project" && right.kind === "project") {
    return left.projectId === right.projectId;
  }
  return (
    left.kind === "node" &&
    right.kind === "node" &&
    left.projectId === right.projectId &&
    left.nodeId === right.nodeId
  );
}

export function isNodeIdentity(
  identity: ConversationIdentity,
): identity is Extract<ConversationIdentity, { kind: "node" }> {
  return identity.kind === "node";
}
