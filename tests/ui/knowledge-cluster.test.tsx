/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { createMemoryPreferenceStorage, WORKSPACE_SEMANTIC_KEY } from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("knowledge cluster underlays", () => {
  it("renders a presentation cluster for each root without domain changes", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    expect(projectA.snapshot.pass.projectRootNodeId).toBeUndefined();
    for (const rootId of projectA.snapshot.pass.rootNodeIds) {
      expect(
        screen.getByTestId(`knowledge-cluster-${rootId}`),
      ).toBeInTheDocument();
    }
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBeNull();
  });
});
