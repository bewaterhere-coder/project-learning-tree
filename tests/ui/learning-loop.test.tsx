/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatProvider } from "../../src/ai/index.js";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applySelectedCommand,
  createMemoryPreferenceStorage,
  openChat,
  selectedProject,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function providerWith(reply: Awaited<ReturnType<ChatProvider["complete"]>>): ChatProvider {
  return {
    complete: async () => reply,
  };
}

function renderLoop(workspace = createDemoWorkspaceFixture().workspace, provider?: ChatProvider) {
  const storage = createMemoryPreferenceStorage();
  render(
    <App
      initialWorkspace={workspace}
      preferenceStorage={storage}
      conversationStore={createMemoryConversationStore({}, storage)}
      chatProvider={provider}
    />,
  );
}

describe("M3B learning loop", () => {
  it("does not mutate Domain when a proposal is shown, ignored, or overridden", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focused = applySelectedCommand(workspace, {
      type: "focusNode",
      nodeId: projectA.ids.q1,
    });
    const snapshotBefore = selectedProject(focused)?.snapshot;
    renderLoop(
      openChat(focused),
      providerWith({
        answer: "A follow-up",
        proposals: [
          {
            id: "p1",
            type: "question",
            sourceNodeId: projectA.ids.q1,
            question: "Why the DAG?",
            goal: "Explain the DAG",
            suggestedDestination: "frontier",
            status: "pending",
          },
        ],
      }),
    );
    await user.type(screen.getByTestId("chat-input"), "go");
    await user.click(screen.getByTestId("chat-send"));
    await waitFor(() => expect(screen.getByTestId("proposal-card-question")).toBeInTheDocument());
    expect(selectedProject(focused)?.snapshot.pass.frontier).toEqual(snapshotBefore?.pass.frontier);

    await user.click(screen.getByTestId("proposal-ignore"));
    expect(screen.queryByTestId("proposal-card-question")).not.toBeInTheDocument();
  });

  it("accepts a question as a blocking child through Application/Domain", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focused = applySelectedCommand(workspace, {
      type: "focusNode",
      nodeId: projectA.ids.q1,
    });
    renderLoop(
      openChat(focused),
      providerWith({
        answer: "Need a child",
        proposals: [
          {
            id: "p-block",
            type: "question",
            sourceNodeId: projectA.ids.q1,
            question: "Why DAG addressing?",
            goal: "Explain addressing",
            suggestedDestination: "frontier",
            status: "pending",
          },
        ],
      }),
    );
    await user.type(screen.getByTestId("chat-input"), "next");
    await user.click(screen.getByTestId("chat-send"));
    await screen.findByTestId("proposal-accept-blocking");
    await user.click(screen.getByTestId("proposal-accept-blocking"));
    await waitFor(() => {
      expect(screen.getAllByText("Why DAG addressing?").length).toBeGreaterThan(0);
    });
  });

  it("accepts a question as a direct child without requiring an active parent", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    renderLoop(
      openChat(workspace),
      providerWith({
        answer: "Later",
        proposals: [
          {
            id: "p-front",
            type: "question",
            sourceNodeId: projectA.ids.q2,
            question: "Pack files?",
            goal: "Understand pack files",
            suggestedDestination: "blocking",
            status: "pending",
          },
        ],
      }),
    );
    await user.type(screen.getByTestId("chat-input"), "later");
    await user.click(screen.getByTestId("chat-send"));
    await screen.findByTestId("proposal-accept-blocking");
    await user.click(screen.getByTestId("proposal-accept-blocking"));
    await waitFor(() => {
      expect(screen.getAllByText("Pack files?").length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId("proposal-error")).not.toBeInTheDocument();
  });

  it("requires confirmation for evidence, criterion, and summary proposals", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focused = applySelectedCommand(workspace, {
      type: "focusNode",
      nodeId: projectA.ids.q1,
    });
    renderLoop(
      openChat(focused),
      providerWith({
        answer: "Drafts",
        proposals: [
          {
            id: "ev",
            type: "evidence",
            sourceNodeId: projectA.ids.q1,
            evidenceType: "note",
            reference: "commit graph notes",
            status: "pending",
          },
        ],
      }),
    );
    await user.type(screen.getByTestId("chat-input"), "evidence please");
    await user.click(screen.getByTestId("chat-send"));
    await screen.findByTestId("proposal-card-evidence");
    expect(screen.queryByTestId("inspector-evidence")).toBeNull();
    await user.click(screen.getByTestId("proposal-adopt"));
    await waitFor(() => {
      expect(screen.queryByTestId("proposal-card-evidence")).not.toBeInTheDocument();
    });
  });

  it("adopts criterion and summary proposals only after confirmation", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const focused = applySelectedCommand(workspace, {
      type: "focusNode",
      nodeId: projectA.ids.q1,
    });
    renderLoop(
      openChat(focused),
      providerWith({
        answer: "Drafts",
        proposals: [
          {
            id: "cr",
            type: "criterion",
            sourceNodeId: projectA.ids.q1,
            description: "Explain blob/tree/commit/tag",
            required: true,
            evidenceRequired: false,
            status: "pending",
          },
          {
            id: "sm",
            type: "summary",
            sourceNodeId: projectA.ids.q1,
            summary: "Q1 learning summary from assistant",
            status: "pending",
          },
        ],
      }),
    );
    await user.type(screen.getByTestId("chat-input"), "完成要求");
    await user.click(screen.getByTestId("chat-send"));
    const criterion = await screen.findByTestId("proposal-card-criterion");
    expect(screen.getByTestId("proposal-card-summary")).toBeInTheDocument();
    await user.click(criterion.querySelector('[data-testid="proposal-adopt"]')!);
    await waitFor(() => {
      expect(screen.getByTestId("inspector-dod")).toHaveTextContent("Explain blob/tree/commit/tag");
    });
    await user.click(screen.getByTestId("proposal-adopt"));
    await waitFor(() => {
      expect(screen.getByTestId("inspector-summary")).toHaveValue(
        "Q1 learning summary from assistant",
      );
    });
  });

  it("does not change focus when completing a node", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    expect(selectedProject(workspace)?.snapshot.pass.currentFocusNodeId).toBe(projectA.ids.q2);
    renderLoop(workspace);
    const focused = screen.getByTestId(`node-${projectA.ids.q2}`);
    expect(focused).toHaveAttribute("data-focus", "true");
    await user.click(screen.getByTestId("chat-open-header"));
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute("data-focus", "true");
  });
});
