import type { MouseEvent, ReactNode } from "react";
import type { TreeNodeView } from "../../src/application/index.js";
import {
  LearningNode,
  LearningNodeToolbarActions,
} from "../../src/ui/tree/LearningNode.js";

interface StubNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  selected?: boolean;
  data: TreeNodeView & {
    isRecommended?: boolean;
    locale?: "en-US" | "zh-CN";
    onOpenChatForNode?: (nodeId: string) => void;
    onCommand?: (command: import("../../src/application/commands.js").UiCommand) => boolean | void;
    onAddChildForNode?: (nodeId: string) => void;
    onCompleteNode?: (nodeId: string) => void;
    onOpenInspectorForNode?: (nodeId: string) => void;
    region?: { rootId: string; title: string };
  };
}

interface StubViewport {
  x: number;
  y: number;
  zoom: number;
}

export function ReactFlow({
  nodes,
  onNodeClick,
  onNodesChange,
  onNodeDragStop,
  onMoveEnd,
  nodesDraggable,
  nodesConnectable,
  edgesReconnectable,
  deleteKeyCode,
  multiSelectionKeyCode,
  selectionKeyCode,
  defaultViewport,
}: {
  nodes: StubNode[];
  onNodeClick?: (event: MouseEvent<HTMLButtonElement>, node: StubNode) => void;
  onNodesChange?: (
    changes: Array<{
      id: string;
      type: "position" | "select";
      position?: { x: number; y: number };
      selected?: boolean;
      dragging?: boolean;
    }>,
  ) => void;
  onNodeDragStop?: (
    event: MouseEvent<HTMLButtonElement>,
    node: StubNode,
  ) => void;
  onMoveEnd?: (event: MouseEvent<HTMLButtonElement> | null, viewport: StubViewport) => void;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  edgesReconnectable?: boolean;
  deleteKeyCode?: string | null;
  multiSelectionKeyCode?: string | null;
  selectionKeyCode?: string | null;
  defaultViewport?: StubViewport;
}) {
  const viewport = defaultViewport ?? { x: 0, y: 0, zoom: 1 };
  return (
    <div
      data-testid="tree-nodes"
      data-nodes-draggable={nodesDraggable ? "true" : "false"}
      data-nodes-connectable={nodesConnectable ? "true" : "false"}
      data-edges-reconnectable={edgesReconnectable ? "true" : "false"}
      data-delete-key={deleteKeyCode === null ? "none" : String(deleteKeyCode ?? "")}
      data-multi-selection={
        multiSelectionKeyCode === null ? "none" : String(multiSelectionKeyCode ?? "default")
      }
      data-selection-key={
        selectionKeyCode === null ? "none" : String(selectionKeyCode ?? "default")
      }
      data-viewport-x={String(viewport.x)}
      data-viewport-y={String(viewport.y)}
      data-viewport-zoom={String(viewport.zoom)}
    >
      {nodes
        .filter((node) => node.type !== "clusterRegion" && !String(node.id).startsWith("cluster:"))
        .map((node) => (
        <div key={node.id}>
          <div
            role="button"
            tabIndex={0}
            data-testid={`node-${node.id}`}
            data-lifecycle={node.data.lifecycle}
            data-blocked={node.data.isBlocked ? "true" : "false"}
            data-on-stack={node.data.isOnActiveStack ? "true" : "false"}
            data-focus={node.data.isCurrentFocus ? "true" : "false"}
            data-parent={node.data.parentId ?? ""}
            data-can-complete={node.data.canComplete ? "true" : "false"}
            data-child-count={String(node.data.childCount ?? 0)}
            data-x={String(node.position?.x ?? 0)}
            data-y={String(node.position?.y ?? 0)}
            onClick={(event) =>
              onNodeClick?.(
                event as unknown as MouseEvent<HTMLButtonElement>,
                node,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onNodeClick?.(
                  event as unknown as MouseEvent<HTMLButtonElement>,
                  node,
                );
              }
            }}
          >
            <LearningNode data={{ ...node.data }} />
            <div className="node-toolbar">
              <LearningNodeToolbarActions
                data={{ ...node.data }}
                onOpenChat={
                  node.data.onOpenChatForNode
                    ? () => node.data.onOpenChatForNode?.(node.id)
                    : undefined
                }
                onAddChild={
                  node.data.onAddChildForNode
                    ? () => node.data.onAddChildForNode?.(node.id)
                    : undefined
                }
                onComplete={
                  node.data.onCompleteNode
                    ? () => node.data.onCompleteNode?.(node.id)
                    : undefined
                }
                onOpenInspector={
                  node.data.onOpenInspectorForNode
                    ? () => node.data.onOpenInspectorForNode?.(node.id)
                    : undefined
                }
              />
            </div>
          </div>
          <button
            type="button"
            data-testid={`node-drag-${node.id}`}
            onClick={(event) => {
              const position = {
                x: (node.position?.x ?? 0) + 100,
                y: (node.position?.y ?? 0) + 40,
              };
              onNodesChange?.([
                { id: node.id, type: "position", position, dragging: false },
              ]);
              onNodeDragStop?.(event, { ...node, position });
            }}
          >
            Drag
          </button>
          <button
            type="button"
            data-testid={`node-multi-select-drag-${node.id}`}
            onClick={(event) => {
              const others = nodes.filter(
                (candidate) =>
                  candidate.id !== node.id &&
                  candidate.type !== "clusterRegion" &&
                  !String(candidate.id).startsWith("cluster:"),
              );
              const peer = others[0];
              if (!peer) {
                return;
              }
              const position = {
                x: (node.position?.x ?? 0) + 100,
                y: (node.position?.y ?? 0) + 40,
              };
              const peerPosition = {
                x: (peer.position?.x ?? 0) + 100,
                y: (peer.position?.y ?? 0) + 40,
              };
              onNodesChange?.([
                { id: node.id, type: "select", selected: true },
                { id: peer.id, type: "select", selected: true },
                { id: node.id, type: "position", position, dragging: false },
                {
                  id: peer.id,
                  type: "position",
                  position: peerPosition,
                  dragging: false,
                },
              ]);
              onNodeDragStop?.(event, { ...node, position });
            }}
          >
            Multi-drag
          </button>
        </div>
      ))}
      {nodes
        .filter((node) => node.type === "clusterRegion" || String(node.id).startsWith("cluster:"))
        .map((node) => (
          <div
            key={node.id}
            data-testid={`knowledge-cluster-${String(node.id).replace(/^cluster:/, "")}`}
            data-cluster="true"
          />
        ))}
      <button
        type="button"
        data-testid="viewport-nudge"
        onClick={(event) =>
          onMoveEnd?.(event, { x: 10, y: 20, zoom: 1.2 })
        }
      >
        Nudge viewport
      </button>
    </div>
  );
}

export function applyNodeChanges(
  changes: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    selected?: boolean;
  }>,
  nodes: StubNode[],
): StubNode[] {
  return nodes.map((node) => {
    let next = node;
    for (const change of changes) {
      if (change.id !== node.id) {
        continue;
      }
      if (change.type === "position" && change.position !== undefined) {
        next = { ...next, position: change.position };
      }
      if (change.type === "select" && change.selected !== undefined) {
        next = { ...next, selected: change.selected };
      }
    }
    return next;
  });
}

export function Background() {
  return null;
}

export function Handle() {
  return null;
}

export function NodeToolbar({
  children,
  isVisible = true,
}: {
  children?: ReactNode;
  isVisible?: boolean;
  position?: unknown;
  offset?: number;
  className?: string;
}) {
  if (!isVisible) {
    return null;
  }
  return <div className="node-toolbar">{children}</div>;
}

export const Position = {
  Top: "top",
  Bottom: "bottom",
  Left: "left",
  Right: "right",
};
