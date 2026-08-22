import {
  Background,
  ReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import { LearningNode } from "./LearningNode.js";
import { toReactFlow, type LearningFlowNode } from "./to-react-flow.js";

const nodeTypes = { learningNode: LearningNode };

export function TreeCanvas({
  model,
  onFocusNode,
}: {
  model: TreeViewModel;
  onFocusNode: (nodeId: NodeId) => void;
}) {
  const { nodes, edges } = useMemo(() => toReactFlow(model), [model]);

  const handleNodeClick: NodeMouseHandler<LearningFlowNode> = useCallback(
    (_event, node) => {
      onFocusNode(node.id);
    },
    [onFocusNode],
  );

  return (
    <div className="tree-canvas-host">
      <ReactFlow<LearningFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        fitView
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
