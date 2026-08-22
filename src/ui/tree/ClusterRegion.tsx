import type { ClusterRegion } from "./cluster-regions.js";

export function ClusterRegionView({ region }: { region: ClusterRegion }) {
  return (
    <div
      className={`knowledge-cluster tone-${region.toneIndex}`}
      data-testid={`knowledge-cluster-${region.rootId}`}
      data-cluster-root={region.rootId}
      aria-hidden="true"
    >
      <p className="knowledge-cluster-title">{region.title}</p>
    </div>
  );
}
