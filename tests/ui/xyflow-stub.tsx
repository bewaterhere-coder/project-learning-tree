import type { MouseEvent } from "react";

interface StubNode {
  id: string;
  data: {
    question: string;
    lifecycle: string;
    isBlocked: boolean;
    isOnActiveStack: boolean;
    isCurrentFocus: boolean;
  };
}

export function ReactFlow({
  nodes,
  onNodeClick,
}: {
  nodes: StubNode[];
  onNodeClick?: (event: MouseEvent<HTMLButtonElement>, node: StubNode) => void;
}) {
  return (
    <div data-testid="tree-nodes">
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          data-testid={`node-${node.id}`}
          data-lifecycle={node.data.lifecycle}
          data-blocked={node.data.isBlocked ? "true" : "false"}
          data-on-stack={node.data.isOnActiveStack ? "true" : "false"}
          data-focus={node.data.isCurrentFocus ? "true" : "false"}
          onClick={(event) => onNodeClick?.(event, node)}
        >
          {node.data.question}
        </button>
      ))}
    </div>
  );
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
