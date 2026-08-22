import type { MouseEvent } from "react";
import { lifecycleMessageKey, t, useLocale } from "../../src/ui/i18n/index.js";

interface StubNode {
  id: string;
  position?: { x: number; y: number };
  data: {
    question: string;
    lifecycle: "open" | "active" | "parked" | "closed";
    isBlocked: boolean;
    unresolvedBlockerCount?: number;
    isOnActiveStack: boolean;
    isCurrentFocus: boolean;
    parentId?: string;
  };
}

interface StubViewport {
  x: number;
  y: number;
  zoom: number;
}

function StubNodeBadges({ data }: { data: StubNode["data"] }) {
  const locale = useLocale();
  return (
    <div className="node-badges">
      <span className="lifecycle-badge">{t(locale, lifecycleMessageKey(data.lifecycle))}</span>
      {data.isBlocked ? (
        <span className="blocked-badge">
          {t(locale, "node.blocked", {
            count: data.unresolvedBlockerCount ?? 0,
          })}
        </span>
      ) : null}
    </div>
  );
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
  defaultViewport,
}: {
  nodes: StubNode[];
  onNodeClick?: (event: MouseEvent<HTMLButtonElement>, node: StubNode) => void;
  onNodesChange?: (
    changes: Array<{
      id: string;
      type: "position";
      position: { x: number; y: number };
      dragging: boolean;
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
      data-viewport-x={String(viewport.x)}
      data-viewport-y={String(viewport.y)}
      data-viewport-zoom={String(viewport.zoom)}
    >
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            type="button"
            data-testid={`node-${node.id}`}
            data-lifecycle={node.data.lifecycle}
            data-blocked={node.data.isBlocked ? "true" : "false"}
            data-on-stack={node.data.isOnActiveStack ? "true" : "false"}
            data-focus={node.data.isCurrentFocus ? "true" : "false"}
            data-parent={node.data.parentId ?? ""}
            data-x={String(node.position?.x ?? 0)}
            data-y={String(node.position?.y ?? 0)}
            onClick={(event) => onNodeClick?.(event, node)}
          >
            <StubNodeBadges data={node.data} />
            {node.data.question}
          </button>
          <button
            type="button"
            data-testid={`node-drag-${node.id}`}
            onClick={(event) => {
              const position = {
                x: (node.position?.x ?? 0) + 50,
                y: (node.position?.y ?? 0) + 25,
              };
              onNodesChange?.([
                { id: node.id, type: "position", position, dragging: false },
              ]);
              onNodeDragStop?.(event, { ...node, position });
            }}
          >
            Drag
          </button>
        </div>
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
  }>,
  nodes: StubNode[],
): StubNode[] {
  return nodes.map((node) => {
    const change = changes.find(
      (entry) => entry.id === node.id && entry.type === "position",
    );
    if (change?.position === undefined) {
      return node;
    }
    return { ...node, position: change.position };
  });
}

export function Background() {
  return null;
}

export function Handle() {
  return null;
}

export const Position = {
  Top: "top",
  Bottom: "bottom",
  Left: "left",
  Right: "right",
};
