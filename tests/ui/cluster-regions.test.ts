import { describe, expect, it } from "vitest";
import type { TreeViewModel } from "../../src/application/index.js";
import {
  CLUSTER_PADDING,
  CLUSTER_TITLE_RESERVE,
  computeClusterRegions,
  clusterNodeId,
  isClusterNodeId,
} from "../../src/ui/tree/cluster-regions.js";
import { NODE_HEIGHT, NODE_WIDTH } from "../../src/ui/tree/layout.js";

function modelFixture(): TreeViewModel {
  return {
    rootNodeIds: ["root-a", "root-b"],
    activeStack: ["root-a", "child-a"],
    currentFocusNodeId: "child-a",
    nodes: [
      {
        id: "root-a",
        question: "How does auth work?",
        goal: "Understand auth",
        lifecycle: "active",
        isBlocked: false,
        unresolvedBlockerCount: 0,
        isOnActiveStack: true,
        isActiveStackLeaf: false,
        isCurrentFocus: false,
        isProjectRoot: true,
      },
      {
        id: "child-a",
        parentId: "root-a",
        question: "What is a session?",
        goal: "Session model",
        lifecycle: "open",
        isBlocked: false,
        unresolvedBlockerCount: 0,
        isOnActiveStack: true,
        isActiveStackLeaf: true,
        isCurrentFocus: true,
        isProjectRoot: false,
      },
      {
        id: "root-b",
        question: "How is state stored?",
        goal: "Persistence",
        lifecycle: "open",
        isBlocked: false,
        unresolvedBlockerCount: 0,
        isOnActiveStack: false,
        isActiveStackLeaf: false,
        isCurrentFocus: false,
        isProjectRoot: true,
      },
    ],
    edges: [
      {
        parentId: "root-a",
        childId: "child-a",
        isOnActiveStack: true,
        isBlocking: true,
        isReceded: false,
      },
    ],
  };
}

describe("cluster regions", () => {
  it("derives presentation-only underlays from root subtrees", () => {
    const regions = computeClusterRegions(modelFixture(), {
      "root-a": { x: 0, y: 0 },
      "child-a": { x: 40, y: NODE_HEIGHT + 72 },
      "root-b": { x: 400, y: 0 },
    });

    expect(regions).toHaveLength(2);
    expect(regions[0]?.id).toBe(clusterNodeId("root-a"));
    expect(regions[0]?.title).toBe("How does auth work?");
    expect(regions[0]?.toneIndex).toBe(0);
    expect(regions[0]?.x).toBe(0 - CLUSTER_PADDING);
    expect(regions[0]?.y).toBe(0 - CLUSTER_PADDING - CLUSTER_TITLE_RESERVE);
    expect(regions[0]?.width).toBe(40 + NODE_WIDTH + CLUSTER_PADDING * 2);
    expect(regions[0]?.height).toBe(
      NODE_HEIGHT + 72 + NODE_HEIGHT + CLUSTER_PADDING * 2 + CLUSTER_TITLE_RESERVE,
    );
    expect(regions[1]?.rootId).toBe("root-b");
    expect(regions[1]?.toneIndex).toBe(1);
    expect(isClusterNodeId(regions[0]!.id)).toBe(true);
    expect(isClusterNodeId("root-a")).toBe(false);
  });
});
