/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  openChat,
  selectedProject,
  WORKSPACE_PREFERENCES_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("PR-042 canvas chat layout usability", () => {
  it("exposes exclusive placement actions and context show/hide labels", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={openChat(workspace)}
        preferenceStorage={createMemoryPreferenceStorage()}
        conversationStore={createMemoryConversationStore()}
      />,
    );

    await user.click(screen.getByTestId("chat-more"));
    expect(screen.getByTestId("chat-placement-floating")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-placement-docked")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-context-toggle")).toHaveTextContent(
      /Show context|显示上下文/,
    );

    await user.click(screen.getByTestId("chat-placement-floating"));
    await user.click(screen.getByTestId("chat-more"));
    expect(screen.getByTestId("chat-placement-docked")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-placement-floating")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-resize-se")).toBeInTheDocument();
  });

  it("fits learning nodes into view without rewriting node positions", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    const before = screen.getByTestId(`node-${projectA.ids.q1}`);
    const beforeX = before.getAttribute("data-x");
    const beforeY = before.getAttribute("data-y");

    await user.click(screen.getByTestId("canvas-fit-all"));

    await waitFor(() => {
      expect(screen.getByTestId("tree-nodes")).toHaveAttribute(
        "data-fit-all-count",
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-x",
      beforeX,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-y",
      beforeY,
    );
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY) ?? "").not.toContain(
      `"${projectA.ids.q1}":{"x":`,
    );
  });

  it("corrects overlapping drops for the dragged node only", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={createMemoryConversationStore({}, storage)}
      />,
    );

    const peer = screen.getByTestId(`node-${projectA.ids.q1}`);
    const peerX = peer.getAttribute("data-x");
    const peerY = peer.getAttribute("data-y");

    await user.click(screen.getByTestId(`node-drag-overlap-${projectA.ids.q2}`));

    await waitFor(() => {
      const dragged = screen.getByTestId(`node-${projectA.ids.q2}`);
      expect(dragged.getAttribute("data-x")).not.toBe(peerX);
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-x",
      peerX,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-y",
      peerY,
    );
  });

  it("renders learning questions inside a single node container without cluster titles", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
        conversationStore={createMemoryConversationStore()}
      />,
    );

    const node = screen.getByTestId(`node-${projectA.ids.q1}`);
    expect(node.querySelector(".node-question")).not.toBeNull();
    expect(node.querySelector(".learning-node-shell")).toBeNull();
    expect(document.querySelector(".knowledge-cluster-title")).toBeNull();
    expect(
      selectedProject(workspace)?.layout.nodePositions[projectA.ids.q1],
    ).toBeUndefined();
  });
});
