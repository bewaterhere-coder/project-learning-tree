import {
  applyNodeChanges,
  Handle,
  Position,
  ReactFlow,
  type NodeMouseHandler,
  type NodeProps,
  type OnMove,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import type { NodePosition, Viewport } from "../../workspace/index.js";
import { layoutOnlyNodeChanges } from "./layout-node-changes.js";
import { LearningNode } from "./LearningNode.js";
import { toReactFlow, type LearningFlowNode } from "./to-react-flow.js";

function FlowLearningNode({ data }: NodeProps<LearningFlowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <LearningNode data={data} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </>
  );
}

const nodeTypes = { learningNode: FlowLearningNode };

export function TreeCanvas({
  model,
  savedPositions,
  viewport,
  persistViewport = true,
  onFocusNode,
  onNodeDragStop,
  onViewportChange,
}: {
  model: TreeViewModel;
  savedPositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  persistViewport?: boolean;
  onFocusNode: (nodeId: NodeId) => void;
  onNodeDragStop: (positions: Record<NodeId, NodePosition>) => void;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const derived = useMemo(
    () => toReactFlow(model, savedPositions),
    [model, savedPositions],
  );
  const [nodes, setNodes] = useState(derived.nodes);
  const [derivedNodes, setDerivedNodes] = useState(derived.nodes);
  if (derived.nodes !== derivedNodes) {
    setDerivedNodes(derived.nodes);
    setNodes(derived.nodes);
  }

  const handleNodeClick: NodeMouseHandler<LearningFlowNode> = useCallback(
    (_event, node) => {
      onFocusNode(node.id);
    },
    [onFocusNode],
  );

  const handleNodesChange: OnNodesChange<LearningFlowNode> = useCallback(
    (changes) => {
      const layoutChanges = layoutOnlyNodeChanges(changes);
      if (layoutChanges.length === 0) {
        return;
      }
      setNodes((current) => applyNodeChanges(layoutChanges, current));
    },
    [],
  );

  const handleNodeDragStop: OnNodeDrag<LearningFlowNode> = useCallback(
    (_event, node) => {
      onNodeDragStop({ [node.id]: { x: node.position.x, y: node.position.y } });
    },
    [onNodeDragStop],
  );

  const handleMoveEnd: OnMove = useCallback(
    (event, nextViewport) => {
      if (event === null || !persistViewport) {
        return;
      }
      onViewportChange({
        x: nextViewport.x,
        y: nextViewport.y,
        zoom: nextViewport.zoom,
      });
    },
    [onViewportChange, persistViewport],
  );

  return (
    <div className="tree-canvas-host">
      <svg className="edge-marker-defs" aria-hidden="true">
        <defs>
          <marker
            id="blocking-tick"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="5"
            orient="auto"
          >
            <rect
              x="2"
              y="1.5"
              width="3.5"
              height="7"
              rx="0.5"
              fill="var(--color-warning)"
            />
          </marker>
        </defs>
      </svg>
      <ReactFlow<LearningFlowNode>
        nodes={nodes}
        edges={derived.edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        panOnDrag
        zoomOnScroll
        defaultViewport={viewport}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
