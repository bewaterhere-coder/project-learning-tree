import {
  Background,
  ReactFlow,
  type NodeMouseHandler,
  type OnMove,
  type OnNodeDrag,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import type { NodePosition, Viewport } from "../../workspace/index.js";
import { LearningNode } from "./LearningNode.js";
import { toReactFlow, type LearningFlowNode } from "./to-react-flow.js";

const nodeTypes = { learningNode: LearningNode };

export function TreeCanvas({
  model,
  savedPositions,
  viewport,
  onFocusNode,
  onNodeDragStop,
  onViewportChange,
}: {
  model: TreeViewModel;
  savedPositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  onFocusNode: (nodeId: NodeId) => void;
  onNodeDragStop: (positions: Record<NodeId, NodePosition>) => void;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const { nodes, edges } = useMemo(
    () => toReactFlow(model, savedPositions),
    [model, savedPositions],
  );

  const handleNodeClick: NodeMouseHandler<LearningFlowNode> = useCallback(
    (_event, node) => {
      onFocusNode(node.id);
    },
    [onFocusNode],
  );

  const handleNodeDragStop: OnNodeDrag<LearningFlowNode> = useCallback(
    (_event, node) => {
      onNodeDragStop({ [node.id]: { x: node.position.x, y: node.position.y } });
    },
    [onNodeDragStop],
  );

  const handleMoveEnd: OnMove = useCallback(
    (_event, nextViewport) => {
      onViewportChange({
        x: nextViewport.x,
        y: nextViewport.y,
        zoom: nextViewport.zoom,
      });
    },
    [onViewportChange],
  );

  return (
    <div className="tree-canvas-host">
      <ReactFlow<LearningFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        defaultViewport={viewport}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
