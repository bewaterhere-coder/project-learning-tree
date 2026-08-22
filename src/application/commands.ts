import {
  activateNode,
  closeNode,
  focusNode,
  parkNode,
  resumeNode,
  returnToParent,
  type DomainResult,
  type DomainSnapshot,
  type NodeId,
} from "../domain/index.js";
import type { TreeSession } from "./session.js";

export type UiCommand =
  | { type: "focusNode"; nodeId: NodeId }
  | { type: "activateNode"; nodeId: NodeId }
  | { type: "parkNode"; nodeId: NodeId }
  | { type: "resumeNode"; nodeId: NodeId }
  | { type: "closeNode"; nodeId: NodeId }
  | { type: "returnToParent" }
  | { type: "dismissError" };

export function dispatchCommand(
  session: TreeSession,
  command: UiCommand,
): TreeSession {
  if (command.type === "dismissError") {
    return { snapshot: session.snapshot };
  }

  const result = runDomainCommand(session.snapshot, command);
  if (!result.ok) {
    return {
      snapshot: session.snapshot,
      lastError: result.error,
      lastErrorCommand: command.type,
    };
  }
  return { snapshot: result.snapshot };
}

function runDomainCommand(
  snapshot: DomainSnapshot,
  command: Exclude<UiCommand, { type: "dismissError" }>,
): DomainResult<DomainSnapshot> {
  switch (command.type) {
    case "focusNode":
      return focusNode(snapshot, { nodeId: command.nodeId });
    case "activateNode":
      return activateNode(snapshot, { nodeId: command.nodeId });
    case "parkNode":
      return parkNode(snapshot, { nodeId: command.nodeId });
    case "resumeNode":
      return resumeNode(snapshot, { nodeId: command.nodeId });
    case "closeNode":
      return closeNode(snapshot, { nodeId: command.nodeId });
    case "returnToParent":
      return returnToParent(snapshot);
  }
}
