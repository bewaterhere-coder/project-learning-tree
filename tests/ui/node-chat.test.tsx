/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatProvider } from "../../src/ai/index.js";
import { App } from "../../src/ui/App.js";
import {
  createMemoryConversationStore,
  CONVERSATION_STORE_KEY,
} from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  createWorkspace,
  createWorkspaceProject,
  openChat,
  pinChatToNode,
  selectedProject,
  updateSelectedLayout,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function renderChat(
  workspace = createDemoWorkspaceFixture().workspace,
  options: { provider?: ChatProvider; storage?: ReturnType<typeof createMemoryPreferenceStorage> } = {},
) {
  const storage = options.storage ?? createMemoryPreferenceStorage();
  const conversationStore = createMemoryConversationStore({}, storage);
  render(
    <App
      initialWorkspace={workspace}
      preferenceStorage={storage}
      conversationStore={conversationStore}
      chatProvider={options.provider}
    />,
  );
  return { storage, conversationStore };
}

describe("M3A contextual chat UI", () => {
  it("does not open chat when focusing a node", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    renderChat(workspace);
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
  });

  it("opens chat from 聊聊这个问题 and closes without changing focus", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focus = selectedProject(workspace)?.snapshot.pass.currentFocusNodeId;
    renderChat(workspace);
    await user.click(screen.getByTestId("chat-open-header"));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    await user.click(screen.getByTestId("chat-close"));
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId(`node-${focus ?? projectA.ids.q2}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
  });

  it("follow-focus switches conversation when chat is already open", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    renderChat(openChat(workspace));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q2);
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
  });

  it("pinned chat stays on the pinned node and can follow again", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const pinned = pinChatToNode(openChat(workspace), projectA.ids.q2);
    renderChat(pinned);
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q2);
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q2);
    expect(screen.getByTestId("chat-divergence")).toBeInTheDocument();
    expect(screen.getByTestId("chat-divergence")).toHaveTextContent(/Viewing|正在查看/);
    await user.click(screen.getByTestId("chat-follow"));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
  });

  it("keeps a moved floating position and can dock without Domain writes in conversation store", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    renderChat(openChat(workspace), { storage });
    const panel = screen.getByTestId("chat-panel");
    expect(panel).toHaveAttribute("data-placement", "docked");
    await user.click(screen.getByTestId("chat-placement-floating"));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-placement", "floating");
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBeNull();
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toContain("floating");
    expect(storage.getItem(CONVERSATION_STORE_KEY) ?? "").not.toContain("chatPlacement");
  });

  it("opens project chat when there is no focused node", async () => {
    const user = userEvent.setup();
    const empty = await createWorkspaceProject(createWorkspace([]), { name: "Bare" });
    renderChat(empty);
    await user.click(screen.getByTestId("chat-open-header"));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-identity-kind", "project");
    expect(screen.getByTestId("chat-title")).toHaveTextContent(/Project conversation|项目对话/);
  });

  it("restores the other project's pin after switching away and back", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    renderChat(pinChatToNode(openChat(workspace), projectA.ids.q1));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
    await user.click(screen.getByTestId(`project-item-${projectB.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-item-${projectA.snapshot.project.id}`));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
  });

  it("routes an in-flight reply to the original node after focus changes", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    let release: ((value: { answer: string; proposals: [] }) => void) | undefined;
    const provider: ChatProvider = {
      complete: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    };
    renderChat(openChat(workspace), { provider });
    await user.type(screen.getByTestId("chat-input"), "hold this");
    await user.click(screen.getByTestId("chat-send"));
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
    release?.({ answer: "secret-for-q2", proposals: [] });
    await waitFor(() => {
      expect(screen.queryByText("secret-for-q2")).not.toBeInTheDocument();
    });
    await user.click(screen.getByTestId(`node-${projectA.ids.q2}`));
    await waitFor(() => {
      expect(screen.getByText("secret-for-q2")).toBeInTheDocument();
    });
  });

  it("shows user-facing context only", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    renderChat(openChat(workspace));
    await user.click(screen.getByTestId("chat-context-toggle"));
    const body = screen.getByTestId("chat-context-body");
    expect(body).toHaveTextContent(/Current question|当前问题/);
    expect(body).not.toHaveTextContent("system prompt");
    expect(body).not.toHaveTextContent("You are");
  });

  it("opens chat from the node action without opening the inspector", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const closedInspector = updateSelectedLayout(workspace, { inspectorOpen: false });
    renderChat(closedInspector);
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();
    const chatAction = screen.getByTestId(`node-chat-${projectA.ids.q1}`);
    expect(chatAction).toHaveClass("node-chat-action");
    await user.click(chatAction);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-node-id", projectA.ids.q1);
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();
  });

  it("selects a node without opening Inspector or Chat", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const closedInspector = updateSelectedLayout(workspace, { inspectorOpen: false });
    renderChat(closedInspector);
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
  });

  it("keeps Inspector and Chat mutually exclusive", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    renderChat(workspace);
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    await user.click(screen.getByTestId(`node-chat-${projectA.ids.q1}`));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("node-inspector")).not.toBeInTheDocument();
    await user.click(screen.getByTestId(`node-more-${projectA.ids.q1}`));
    await user.click(screen.getByTestId(`node-open-inspector-${projectA.ids.q1}`));
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
  });
});
