import type { Node, NodeProps } from "@xyflow/react";
import type { NodeId, TreeViewModel } from "../../application/index.js";
import type { NodePosition } from "../../workspace/index.js";
import { ClusterRegionView } from "./ClusterRegion.js";
import {
  computeClusterRegions,
  type ClusterRegion,
} from "./cluster-regions.js";

export type ClusterFlowNode = Node<
  { region: ClusterRegion } & Record<string, unknown>,
  "clusterRegion"
>;

export function toClusterFlowNodes(
  model: TreeViewModel,
  positions: Record<NodeId, NodePosition>,
): ClusterFlowNode[] {
  return computeClusterRegions(model, positions).map((region) => ({
    id: region.id,
    type: "clusterRegion" as const,
    position: { x: region.x, y: region.y },
    data: { region },
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    zIndex: -1,
    style: {
      width: region.width,
      height: region.height,
      pointerEvents: "none",
    },
  }));
}

export function ClusterRegionFlowNode({
  data,
}: NodeProps<ClusterFlowNode>) {
  return <ClusterRegionView region={data.region} />;
}
