/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatProvider } from "../../src/ai/index.js";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  openChat,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("node chat suggestions", () => {
  it("renders structured suggestions from the provider", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    const provider: ChatProvider = {
      complete: async () => ({
        answer: "Focus on the parent question first.",
        suggestions: ["Compare with the project goal", "Write one sentence of progress"],
        proposals: [],
      }),
    };

    render(
      <App
        initialWorkspace={openChat(workspace)}
        preferenceStorage={createMemoryPreferenceStorage()}
        conversationStore={createMemoryConversationStore({}, createMemoryPreferenceStorage())}
        chatProvider={provider}
      />,
    );

    await user.type(screen.getByTestId("chat-input"), "What should I do?");
    await user.click(screen.getByTestId("chat-send"));

    await waitFor(() => {
      expect(screen.getByText("Focus on the parent question first.")).toBeInTheDocument();
    });
    expect(screen.getByTestId("chat-suggestions")).toBeInTheDocument();
    expect(screen.getByText("Compare with the project goal")).toBeInTheDocument();
  });
});
