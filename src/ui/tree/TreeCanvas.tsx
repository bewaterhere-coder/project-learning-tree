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
import type { UiCommand } from "../../application/index.js";
import type { NodePosition, Viewport, WorkspaceLocale } from "../../workspace/index.js";
import {
  ClusterRegionFlowNode,
  toClusterFlowNodes,
} from "./cluster-flow.js";
import { isClusterNodeId } from "./cluster-regions.js";
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
        locale={data.locale ?? "en-US"}
        onOpenChat={
          data.onOpenChatForNode
            ? () => data.onOpenChatForNode?.(data.id)
            : undefined
        }
        onCommand={data.onCommand}
      />
    </>
  );
}

const nodeTypes = {
  learningNode: FlowLearningNode,
  clusterRegion: ClusterRegionFlowNode,
};

export function TreeCanvas({
  model,
  savedPositions,
  viewport,
  persistViewport = true,
  recommendedNodeIds = [],
  locale,
  onFocusNode,
  onOpenChatForNode,
  onCommand,
  onNodeDragStop,
  onViewportChange,
}: {
  model: TreeViewModel;
  savedPositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  persistViewport?: boolean;
  recommendedNodeIds?: readonly NodeId[];
  locale: WorkspaceLocale;
  onFocusNode: (nodeId: NodeId) => void;
  onOpenChatForNode: (nodeId: NodeId) => void;
  onCommand: (command: UiCommand) => boolean | void;
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
          locale,
          onOpenChatForNode,
          onCommand,
        },
      })),
    [locale, onCommand, onOpenChatForNode],
  );
  const [nodes, setNodes] = useState(() => enrichNodes(derived.nodes));
  const [derivedNodes, setDerivedNodes] = useState(derived.nodes);
  if (derived.nodes !== derivedNodes) {
    setDerivedNodes(derived.nodes);
    setNodes(enrichNodes(derived.nodes));
  }

  const clusterNodes = useMemo(() => {
    const positions: Record<NodeId, NodePosition> = {};
    for (const node of nodes) {
      positions[node.id] = node.position;
    }
    return toClusterFlowNodes(model, positions);
  }, [model, nodes]);

  const flowNodes = useMemo(
    () => [...clusterNodes, ...nodes],
    [clusterNodes, nodes],
  );

  const edges = useMemo(
    () => routeEdgesForNodes(derived.edges, nodes),
    [derived.edges, nodes],
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (isClusterNodeId(node.id)) {
        return;
      }
      onFocusNode(node.id);
    },
    [onFocusNode],
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const layoutChanges = layoutOnlyNodeChanges(changes).filter(
        (change) => "id" in change && !isClusterNodeId(String(change.id)),
      );
      if (layoutChanges.length === 0) {
        return;
      }
      setNodes((current) =>
        enrichNodes(
          applyNodeChanges(layoutChanges, current) as LearningFlowNode[],
        ),
      );
    },
    [enrichNodes],
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      if (isClusterNodeId(node.id)) {
        return;
      }
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
            markerWidth="8"
            markerHeight="8"
            refX="5"
            refY="4"
            orient="auto"
          >
            <rect
              className="blocking-tick-mark"
              x="2"
              y="1.5"
              width="2.5"
              height="5"
              rx="0.5"
              fill="var(--color-warning)"
            />
          </marker>
        </defs>
      </svg>
      <ReactFlow
        nodes={flowNodes}
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
