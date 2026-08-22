import {
  activateNode,
  addCoreQuestion,
  closeNode,
  createBlockingChild,
  createChild,
  defaultPorts,
  focusNode,
  markChildBlocking,
  parkNode,
  resumeNode,
  returnToParent,
  unmarkChildBlocking,
  type DomainResult,
  type DomainSnapshot,
  type LearningDepth,
  type NodeId,
  type Ports,
} from "../domain/index.js";
import type { TreeSession } from "./session.js";

export type UiCommand =
  | { type: "focusNode"; nodeId: NodeId }
  | { type: "activateNode"; nodeId: NodeId }
  | { type: "parkNode"; nodeId: NodeId }
  | { type: "resumeNode"; nodeId: NodeId }
  | { type: "closeNode"; nodeId: NodeId }
  | { type: "returnToParent" }
  | {
      type: "createChild";
      parentId: NodeId;
      question: string;
      goal: string;
      targetDepth?: LearningDepth;
    }
  | {
      type: "createBlockingChild";
      parentId: NodeId;
      question: string;
      goal: string;
      targetDepth?: LearningDepth;
    }
  | { type: "markChildBlocking"; parentId: NodeId; childId: NodeId }
  | { type: "unmarkChildBlocking"; parentId: NodeId; childId: NodeId }
  | {
      type: "addCoreQuestion";
      question: string;
      goal: string;
      targetDepth?: LearningDepth;
    }
  | { type: "dismissError" };

export function dispatchCommand(
  session: TreeSession,
  command: UiCommand,
  ports: Ports = defaultPorts(),
): TreeSession {
  if (command.type === "dismissError") {
    return { snapshot: session.snapshot };
  }

  const result = runDomainCommand(session.snapshot, command, ports);
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
  ports: Ports,
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
    case "createChild":
      return createChild(
        snapshot,
        {
          parentId: command.parentId,
          question: command.question,
          goal: command.goal,
          targetDepth: command.targetDepth,
        },
        ports,
      );
    case "createBlockingChild":
      return createBlockingChild(
        snapshot,
        {
          parentId: command.parentId,
          question: command.question,
          goal: command.goal,
          targetDepth: command.targetDepth,
        },
        ports,
      );
    case "markChildBlocking":
      return markChildBlocking(snapshot, {
        parentId: command.parentId,
        childId: command.childId,
      });
    case "unmarkChildBlocking":
      return unmarkChildBlocking(snapshot, {
        parentId: command.parentId,
        childId: command.childId,
      });
    case "addCoreQuestion":
      return addCoreQuestion(
        snapshot,
        {
          question: command.question,
          goal: command.goal,
          targetDepth: command.targetDepth,
        },
        ports,
      );
  }
}
