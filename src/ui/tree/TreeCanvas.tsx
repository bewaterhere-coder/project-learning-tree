import {
  applyNodeChanges,
  NodeToolbar,
  Position,
  ReactFlow,
  type NodeMouseHandler,
  type NodeProps,
  type OnMove,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import type { NodePosition, Viewport, WorkspaceLocale } from "../../workspace/index.js";
import {
  ClusterRegionFlowNode,
  toClusterFlowNodes,
} from "./cluster-flow.js";
import { isClusterNodeId } from "./cluster-regions.js";
import { layoutOnlyNodeChanges } from "./layout-node-changes.js";
import {
  LearningNode,
  LearningNodeToolbarActions,
} from "./LearningNode.js";
import { LearningNodeHandles } from "./node-handles.js";
import {
  routeEdgesForNodes,
  toReactFlow,
  type LearningFlowNode,
} from "./to-react-flow.js";

function FlowLearningNode({ data, selected }: NodeProps<LearningFlowNode>) {
  const [hovered, setHovered] = useState(false);
  const showToolbar = Boolean(selected || data.isCurrentFocus || hovered);

  return (
    <div
      className="learning-node-shell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <LearningNodeHandles />
      <LearningNode data={data} />
      <NodeToolbar
        isVisible={showToolbar}
        position={Position.Bottom}
        offset={8}
        className="node-toolbar"
      >
        <LearningNodeToolbarActions
          data={data}
          onOpenChat={
            data.onOpenChatForNode
              ? () => data.onOpenChatForNode?.(data.id)
              : undefined
          }
          onAddChild={
            data.onAddChildForNode
              ? () => data.onAddChildForNode?.(data.id)
              : undefined
          }
          onComplete={
            data.onCompleteNode ? () => data.onCompleteNode?.(data.id) : undefined
          }
          onOpenInspector={
            data.onOpenInspectorForNode
              ? () => data.onOpenInspectorForNode?.(data.id)
              : undefined
          }
        />
      </NodeToolbar>
    </div>
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
  onAddChildForNode,
  onCompleteNode,
  onOpenInspectorForNode,
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
  onAddChildForNode: (nodeId: NodeId) => void;
  onCompleteNode: (nodeId: NodeId) => void;
  onOpenInspectorForNode: (nodeId: NodeId) => void;
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
          onAddChildForNode,
          onCompleteNode,
          onOpenInspectorForNode,
        },
      })),
    [locale, onOpenChatForNode, onAddChildForNode, onCompleteNode, onOpenInspectorForNode],
  );
  const [nodes, setNodes] = useState(() => enrichNodes(derived.nodes));
  const [derivedNodes, setDerivedNodes] = useState(derived.nodes);
  const draggingNodeIdRef = useRef<string | null>(null);
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
      setNodes((current) => {
        const positionChanges = layoutChanges.filter(
          (change) => change.type === "position" && "id" in change,
        ) as Array<{ id: string; type: "position"; dragging?: boolean }>;
        const positionIds = [...new Set(positionChanges.map((change) => change.id))];
        // PR-038: only one learning node may translate; gesture target wins —
        // never prefer current-focus over the node actually being dragged.
        let applied = layoutChanges;
        if (positionIds.length > 1) {
          const draggingMarked = positionChanges.find(
            (change) => change.dragging === true,
          )?.id;
          const keepId =
            draggingNodeIdRef.current ?? draggingMarked ?? positionIds[0];
          applied = layoutChanges.filter(
            (change) =>
              change.type !== "position" ||
              ("id" in change && String(change.id) === keepId),
          );
        }
        const next = enrichNodes(
          applyNodeChanges(applied, current) as LearningFlowNode[],
        );
        const selectedIds = next
          .filter((node) => node.selected)
          .map((node) => node.id);
        if (selectedIds.length <= 1) {
          return next;
        }
        const keepSelected =
          draggingNodeIdRef.current ??
          next.find((node) => node.data.isCurrentFocus)?.id ??
          selectedIds[0];
        return next.map((node) => ({
          ...node,
          selected: node.id === keepSelected,
        }));
      });
    },
    [enrichNodes],
  );

  const handleNodeDragStart: OnNodeDrag = useCallback((_event, node) => {
    if (isClusterNodeId(node.id)) {
      return;
    }
    draggingNodeIdRef.current = node.id;
  }, []);

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      if (isClusterNodeId(node.id)) {
        draggingNodeIdRef.current = null;
        return;
      }
      onNodeDragStop({ [node.id]: { x: node.position.x, y: node.position.y } });
      draggingNodeIdRef.current = null;
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
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
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
