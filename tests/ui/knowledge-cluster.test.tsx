/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { createMemoryPreferenceStorage, WORKSPACE_SEMANTIC_KEY } from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("knowledge cluster underlays", () => {
  it("renders clusters only for multi-node top-level question subtrees", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    expect(projectA.snapshot.pass.projectRootNodeId).toBeDefined();
    const questionRoots =
      projectA.snapshot.nodes[projectA.snapshot.pass.projectRootNodeId!]
        ?.childIds ?? [];
    for (const rootId of questionRoots) {
      const childCount =
        projectA.snapshot.nodes[rootId]?.childIds.length ?? 0;
      const cluster = screen.queryByTestId(`knowledge-cluster-${rootId}`);
      if (childCount > 0) {
        expect(cluster).toBeInTheDocument();
      } else {
        expect(cluster).not.toBeInTheDocument();
      }
    }
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBeNull();
  });
});
