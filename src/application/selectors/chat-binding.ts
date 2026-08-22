import type { NodeId, ProjectId } from "../../domain/index.js";

export type ChatBindingInput =
  | { mode: "follow-focus" }
  | { mode: "pinned"; projectId: ProjectId; nodeId: NodeId };

export type BoundConversationIdentity =
  | { kind: "node"; projectId: ProjectId; nodeId: NodeId }
  | { kind: "project"; projectId: ProjectId };

export function selectBoundConversationIdentity(
  projectId: ProjectId,
  currentFocusNodeId: NodeId | undefined,
  binding: ChatBindingInput,
): BoundConversationIdentity {
  if (binding.mode === "pinned" && binding.projectId === projectId) {
    return { kind: "node", projectId, nodeId: binding.nodeId };
  }
  if (currentFocusNodeId !== undefined) {
    return { kind: "node", projectId, nodeId: currentFocusNodeId };
  }
  return { kind: "project", projectId };
}

export function selectFocusDiffersFromChat(
  currentFocusNodeId: NodeId | undefined,
  identity: BoundConversationIdentity,
): boolean {
  if (identity.kind === "project") {
    return currentFocusNodeId !== undefined;
  }
  return currentFocusNodeId !== undefined && currentFocusNodeId !== identity.nodeId;
}
