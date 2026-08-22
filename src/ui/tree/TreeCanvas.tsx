import {
  applyNodeChanges,
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
import { LearningNodeHandles } from "./node-handles.js";
import {
  routeEdgesForNodes,
  toReactFlow,
  type LearningFlowNode,
} from "./to-react-flow.js";

function FlowLearningNode({ data }: NodeProps<LearningFlowNode>) {
  return (
    <>
      <LearningNodeHandles />
      <LearningNode
        data={data}
        onOpenChat={
          data.onOpenChatForNode
            ? () => data.onOpenChatForNode?.(data.id)
            : undefined
        }
      />
    </>
  );
}

const nodeTypes = { learningNode: FlowLearningNode };

export function TreeCanvas({
  model,
  savedPositions,
  viewport,
  persistViewport = true,
  recommendedNodeIds = [],
  onFocusNode,
  onOpenChatForNode,
  onNodeDragStop,
  onViewportChange,
}: {
  model: TreeViewModel;
  savedPositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  persistViewport?: boolean;
  recommendedNodeIds?: readonly NodeId[];
  onFocusNode: (nodeId: NodeId) => void;
  onOpenChatForNode: (nodeId: NodeId) => void;
  onNodeDragStop: (positions: Record<NodeId, NodePosition>) => void;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const derived = useMemo(
    () => toReactFlow(model, savedPositions, recommendedNodeIds),
    [model, savedPositions, recommendedNodeIds],
  );
  const enrichNodes = useCallback(
    (base: LearningFlowNode[]) =>
      base.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onOpenChatForNode,
        },
      })),
    [onOpenChatForNode],
  );
  const [nodes, setNodes] = useState(() => enrichNodes(derived.nodes));
  const [derivedNodes, setDerivedNodes] = useState(derived.nodes);
  if (derived.nodes !== derivedNodes) {
    setDerivedNodes(derived.nodes);
    setNodes(enrichNodes(derived.nodes));
  }

  const edges = useMemo(
    () => routeEdgesForNodes(derived.edges, nodes),
    [derived.edges, nodes],
  );

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
      setNodes((current) =>
        enrichNodes(applyNodeChanges(layoutChanges, current)),
      );
    },
    [enrichNodes],
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
        edges={edges}
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
