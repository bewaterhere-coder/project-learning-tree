/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { selectTreeViewModel } from "../../src/application/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { App } from "../../src/ui/App.js";
import { toReactFlow } from "../../src/ui/tree/to-react-flow.js";
import {
  createMemoryPreferenceStorage,
  createWorkspace,
  openChat,
  selectedProject,
  setInspectorOpen,
  updateSelectedLayout,
} from "../../src/workspace/index.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("TASK-009 canvas simplification", () => {
  it("maps every flat question node into React Flow without Project Root filters", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const snapshot = selectedProject(workspace)!.snapshot;
    const model = selectTreeViewModel(snapshot);

    expect(snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(model.rootNodeIds).toEqual(
      expect.arrayContaining([projectA.ids.q1, projectA.ids.q2]),
    );
    expect(model.nodes.every((node) => !("isProjectRoot" in node))).toBe(true);

    const flow = toReactFlow(model);
    expect(flow.nodes.map((node) => node.id).sort()).toEqual(
      model.nodes.map((node) => node.id).sort(),
    );
    expect(flow.nodes.every((node) => node.data.childCount !== undefined)).toBe(
      true,
    );
  });

  it("renders child progress on parents and child count on leaves", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    expect(screen.getByTestId(`node-progress-${projectA.ids.q1}`)).toBeInTheDocument();
    expect(screen.getByTestId(`node-child-count-${projectA.ids.q2}`)).toBeInTheDocument();
  });

  it("does not open Chat when focusing a node and keeps panels exclusive", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const closed = setInspectorOpen(
      createWorkspace([selectedProject(workspace)!.snapshot]),
      false,
    );
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={closed}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();

    await user.click(screen.getByTestId(`node-chat-${projectA.ids.q1}`));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();

    await user.click(screen.getByTestId(`node-more-${projectA.ids.q1}`));
    await user.click(screen.getByTestId(`node-open-inspector-${projectA.ids.q1}`));
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
  });

  it("defaults new chat layout to docked", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const opened = openChat(updateSelectedLayout(workspace, { chatOpen: false }));
    expect(selectedProject(opened)?.layout.chatPlacement).toBe("docked");
    expect(selectedProject(opened)?.layout.inspectorOpen).toBe(false);
  });
});
