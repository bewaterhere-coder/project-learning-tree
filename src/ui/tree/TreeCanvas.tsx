import {
  applyNodeChanges,
  NodeToolbar,
  Position,
  ReactFlow,
  type NodeMouseHandler,
  type NodeProps,
  type OnMove,
  type Node,
  type OnNodeDrag,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import type { NodePosition, Viewport, WorkspaceLocale } from "../../workspace/index.js";
import {
  ClusterRegionFlowNode,
  toClusterFlowNodes,
} from "./cluster-flow.js";
import { isClusterNodeId } from "./cluster-regions.js";
import {
  layoutOnlyNodeChanges,
  selectionNodeChanges,
} from "./layout-node-changes.js";
import {
  LearningNode,
  LearningNodeToolbarActions,
} from "./LearningNode.js";
import { LearningNodeHandles } from "./node-handles.js";
import { LayoutMenu } from "./LayoutMenu.js";
import {
  computeLayout,
  type LayoutDirection,
} from "./layout.js";
import {
  resolveDragCollision,
  resolveNodeBoxSize,
} from "./resolve-drag-collision.js";
import {
  routeEdgesForNodes,
  toReactFlow,
  type LearningFlowNode,
} from "./to-react-flow.js";

type Callbacks = {
  locale: WorkspaceLocale;
  onOpenChatForNode: (nodeId: NodeId) => void;
  onAddChildForNode: (nodeId: NodeId) => void;
  onCompleteNode: (nodeId: NodeId) => void;
  onOpenInspectorForNode: (nodeId: NodeId) => void;
};

function FlowLearningNode({ data, selected }: NodeProps<LearningFlowNode>) {
  const [hovered, setHovered] = useState(false);
  const showToolbar = Boolean(
    !data.isProjectRoot && (selected || data.isCurrentFocus || hovered),
  );


  return (
    <>
      <LearningNode
        data={data}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        handles={<LearningNodeHandles />}
      />
      {data.isProjectRoot ? null : (
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
      )}
    </>
  );
}

const nodeTypes = {
  learningNode: FlowLearningNode,
  clusterRegion: ClusterRegionFlowNode,
};

function enrichNodes(
  base: LearningFlowNode[],
  callbacks: Callbacks,
): LearningFlowNode[] {
  return base.map((node) => ({
    ...node,
    data: {
      ...node.data,
      locale: callbacks.locale,
      onOpenChatForNode: node.data.isProjectRoot
        ? undefined
        : callbacks.onOpenChatForNode,
      onAddChildForNode: node.data.isProjectRoot
        ? undefined
        : callbacks.onAddChildForNode,
      onCompleteNode: node.data.isProjectRoot
        ? undefined
        : callbacks.onCompleteNode,
      onOpenInspectorForNode: node.data.isProjectRoot
        ? undefined
        : callbacks.onOpenInspectorForNode,
    },
  }));
}

function positionSignature(nodes: readonly LearningFlowNode[]): string {
  return nodes
    .map((node) => `${node.id}:${node.position.x.toFixed(2)},${node.position.y.toFixed(2)}`)
    .join("|");
}

/** Topology + titles used for clusters — excludes focus/selection chrome. */
function clusterStructureSignature(model: TreeViewModel): string {
  const nodes = model.nodes
    .map(
      (node) =>
        `${node.id}:${node.parentId ?? ""}:${node.isProjectRoot ? "1" : "0"}:${node.question}`,
    )
    .join("|");
  const edges = model.edges
    .map((edge) => `${edge.parentId}->${edge.childId}`)
    .join("|");
  return `${nodes}#${edges}`;
}

function positionsFromNodes(
  nodes: readonly LearningFlowNode[],
): Record<NodeId, NodePosition> {
  const positions: Record<NodeId, NodePosition> = {};
  for (const node of nodes) {
    positions[node.id] = node.position;
  }
  return positions;
}

function mergeDerivedNodes(
  previous: LearningFlowNode[],
  next: LearningFlowNode[],
): LearningFlowNode[] {
  const prevById = new Map(previous.map((node) => [node.id, node]));
  return next.map((node) => {
    const prev = prevById.get(node.id);
    if (!prev) {
      return node;
    }
    return {
      ...node,
      position: prev.position,
      selected: node.selected,
      data: {
        ...node.data,
        onOpenChatForNode: prev.data.onOpenChatForNode,
        onAddChildForNode: prev.data.onAddChildForNode,
        onCompleteNode: prev.data.onCompleteNode,
        onOpenInspectorForNode: prev.data.onOpenInspectorForNode,
        locale: prev.data.locale ?? node.data.locale,
      },
    };
  });
}

function normalizeSingleSelection(
  nodes: LearningFlowNode[],
  preferId: string | null,
): LearningFlowNode[] {
  const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id);
  if (selectedIds.length <= 1) {
    return nodes;
  }
  const keepId =
    preferId ??
    nodes.find((node) => node.data.isCurrentFocus)?.id ??
    selectedIds[0];
  return nodes.map((node) => ({
    ...node,
    selected: node.id === keepId,
  }));
}


function savedPositionsSignature(
  positions: Record<NodeId, NodePosition>,
): string {
  return Object.keys(positions)
    .sort()
    .map((id) => {
      const position = positions[id]!;
      return `${id}:${position.x.toFixed(2)},${position.y.toFixed(2)}`;
    })
    .join("|");
}

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
  onApplyLayout,
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
  onApplyLayout: (positions: Record<NodeId, NodePosition>) => void;
}) {
  const callbacks: Callbacks = {
    locale,
    onOpenChatForNode,
    onAddChildForNode,
    onCompleteNode,
    onOpenInspectorForNode,
  };
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const derived = useMemo(
    () => toReactFlow(model, savedPositions, recommendedNodeIds),
    [model, savedPositions, recommendedNodeIds],
  );
  const [nodes, setNodes] = useState(() => enrichNodes(derived.nodes, callbacks));
  const [derivedNodes, setDerivedNodes] = useState(derived.nodes);
  const [structureEpoch, setStructureEpoch] = useState(0);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const modelRef = useRef(model);
  modelRef.current = model;
  const draggingNodeIdRef = useRef<string | null>(null);
  const savedPositionsKey = savedPositionsSignature(savedPositions);
  const savedPositionsKeyRef = useRef(savedPositionsKey);


  if (derived.nodes !== derivedNodes) {
    setDerivedNodes(derived.nodes);
    const savedChanged = savedPositionsKeyRef.current !== savedPositionsKey;
    savedPositionsKeyRef.current = savedPositionsKey;
    setNodes((current) => {
      const enriched = enrichNodes(derived.nodes, callbacksRef.current);
      const sameIds =
        current.length === enriched.length &&
        current.every((node, index) => node.id === enriched[index]?.id);
      if (sameIds && !savedChanged) {
        return mergeDerivedNodes(current, enriched);
      }
      if (sameIds && savedChanged) {
        setClusterNodes(
          toClusterFlowNodes(modelRef.current, positionsFromNodes(enriched)),
        );
        setClusterSyncKey(
          `${clusterStructureSignature(modelRef.current)}#${structureEpoch}#${positionSignature(enriched)}`,
        );
        return enriched;
      }
      setStructureEpoch((value) => value + 1);
      return enriched;
    });
  }

  const positionsKey = positionSignature(nodes);
  const clusterStructureKey = clusterStructureSignature(model);
  // Rebuild underlays on topology change or after drag-stop position commit —
  // not on pure selection / focus chrome, and not on every drag tick.
  const [clusterNodes, setClusterNodes] = useState(() =>
    toClusterFlowNodes(model, positionsFromNodes(nodes)),
  );
  const [clusterSyncKey, setClusterSyncKey] = useState(
    () => `${clusterStructureKey}#${structureEpoch}#${positionsKey}`,
  );
  const nextClusterSyncKey = `${clusterStructureKey}#${structureEpoch}`;
  if (
    !clusterSyncKey.startsWith(`${clusterStructureKey}#${structureEpoch}`)
  ) {
    setClusterSyncKey(`${nextClusterSyncKey}#${positionsKey}`);
    setClusterNodes(
      toClusterFlowNodes(model, positionsFromNodes(nodesRef.current)),
    );
  }

  const flowNodes = useMemo(
    () => [...clusterNodes, ...nodes],
    [clusterNodes, nodes],
  );

  const edges = useMemo(
    () => routeEdgesForNodes(derived.edges, nodes),
    [derived.edges, nodes, positionsKey],
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

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    const selectChanges = selectionNodeChanges(changes).filter(
      (change) => "id" in change && !isClusterNodeId(String(change.id)),
    );
    if (selectChanges.length > 0) {
      setNodes((current) => {
        const selectedById = new Map<string, boolean>();
        for (const change of selectChanges) {
          if (change.type === "select" && "id" in change && "selected" in change) {
            selectedById.set(String(change.id), Boolean(change.selected));
          }
        }
        if (selectedById.size === 0) {
          return current;
        }
        const patched = current.map((node) =>
          selectedById.has(node.id)
            ? { ...node, selected: selectedById.get(node.id) }
            : node,
        );
        // PR-038: never leave multiple learning nodes selected.
        return normalizeSingleSelection(patched, draggingNodeIdRef.current);
      });
    }

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
      return applyNodeChanges(applied, current) as LearningFlowNode[];
    });
  }, []);

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
      const live = nodesRef.current;
      const peers = live
        .filter((candidate) => !isClusterNodeId(candidate.id))
        .map((candidate) => {
          const size = resolveNodeBoxSize(candidate);
          return {
            id: candidate.id,
            x: candidate.position.x,
            y: candidate.position.y,
            width: size.width,
            height: size.height,
          };
        });
      const draggedSize = resolveNodeBoxSize(node);
      const resolved = resolveDragCollision(
        {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
          width: draggedSize.width,
          height: draggedSize.height,
        },
        peers,
      );
      const nextPosition = { x: resolved.x, y: resolved.y };
      if (resolved.corrected) {
        setNodes((current) =>
          current.map((candidate) =>
            candidate.id === node.id
              ? {
                  ...candidate,
                  position: nextPosition,
                  className: "learning-node-settling",
                }
              : candidate,
          ),
        );
        window.setTimeout(() => {
          setNodes((current) =>
            current.map((candidate) =>
              candidate.id === node.id
                ? { ...candidate, className: undefined }
                : candidate,
            ),
          );
        }, 200);
      }
      const positionsLive = resolved.corrected
        ? live.map((candidate) =>
            candidate.id === node.id
              ? { ...candidate, position: nextPosition }
              : candidate,
          )
        : live;
      setClusterNodes(
        toClusterFlowNodes(modelRef.current, positionsFromNodes(positionsLive)),
      );
      setClusterSyncKey(
        `${clusterStructureSignature(modelRef.current)}#${structureEpoch}#${positionSignature(positionsLive)}`,
      );
      onNodeDragStop({ [node.id]: nextPosition });
      draggingNodeIdRef.current = null;
    },
    [onNodeDragStop, structureEpoch],
  );

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const handleFitAll = useCallback(() => {
    const instance = reactFlowRef.current;
    if (!instance) {
      return;
    }
    const learning = nodesRef.current.filter(
      (candidate) => !isClusterNodeId(candidate.id),
    );
    if (learning.length === 0) {
      return;
    }
    void instance.fitView({
      nodes: learning,
      padding: 0.18,
      duration: 200,
    });
  }, []);

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

  const handleApplyLayoutDirection = useCallback(
    (direction: LayoutDirection) => {
      onApplyLayout(computeLayout(model, direction));
    },
    [model, onApplyLayout],
  );

  return (
    <div className="tree-canvas-host">
      <LayoutMenu
        disabled={model.nodes.length === 0}
        onSelect={handleApplyLayoutDirection}
        onFitAll={handleFitAll}
      />
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
        nodes={flowNodes as Node[]}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
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
