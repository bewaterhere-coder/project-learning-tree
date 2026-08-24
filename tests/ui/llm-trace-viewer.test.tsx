/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LLMInteractionTrace } from "../../src/ai/index.js";
import type { LlmTraceApiClient, LlmTraceListItem } from "../../src/infrastructure/index.js";
import { App } from "../../src/ui/App.js";
import { createMemoryConversationStore } from "../../src/conversation/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { createMemoryPreferenceStorage } from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function sampleListItem(overrides: Partial<LlmTraceListItem> = {}): LlmTraceListItem {
  return {
    id: "t1",
    createdAt: "2026-08-24T00:00:00.000Z",
    durationMs: 42,
    provider: "mock",
    model: "mock-model",
    status: "ok",
    inputPreview: "What next?",
    projectId: "p1",
    suggestionCount: 1,
    ...overrides,
  };
}

function sampleDetail(overrides: Partial<LLMInteractionTrace> = {}): LLMInteractionTrace {
  return {
    id: "t1",
    createdAt: "2026-08-24T00:00:00.000Z",
    completedAt: "2026-08-24T00:00:00.042Z",
    durationMs: 42,
    provider: "mock",
    model: "mock-model",
    input: "What next?",
    request: {
      hasNode: true,
      hasParent: false,
      historyCount: 0,
      projectId: "p1",
      nodeId: "n1",
    },
    response: { answer: "Clarify the goal.", suggestionCount: 1 },
    status: "ok",
    ...overrides,
  };
}

function createClient(options: {
  list?: LlmTraceListItem[];
  detail?: LLMInteractionTrace;
  listError?: string;
} = {}): LlmTraceApiClient {
  return {
    listTraces: async () => {
      if (options.listError) {
        throw new Error(options.listError);
      }
      const traces = options.list ?? [];
      return { traces, total: traces.length };
    },
    getTrace: async (id) => {
      if (options.detail && options.detail.id === id) {
        return options.detail;
      }
      throw new Error("Trace not found");
    },
    clearTraces: async () => undefined,
  };
}

function renderApp(client?: LlmTraceApiClient, apiUrl = "/api/llm-traces") {
  const storage = createMemoryPreferenceStorage();
  const conversationStore = createMemoryConversationStore({}, storage);
  const { workspace } = createDemoWorkspaceFixture();
  render(
    <App
      initialWorkspace={workspace}
      preferenceStorage={storage}
      conversationStore={conversationStore}
      llmTraceApiUrl={apiUrl}
      llmTraceClient={client}
    />,
  );
}

describe("LLM Trace Viewer", () => {
  it("opens from settings, lists traces, and shows detail", async () => {
    const user = userEvent.setup();
    renderApp(
      createClient({
        list: [sampleListItem()],
        detail: sampleDetail(),
      }),
    );

    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("llm-traces-open"));
    expect(screen.getByTestId("llm-trace-viewer")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("llm-trace-row-t1")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("llm-trace-row-t1"));
    await waitFor(() => {
      expect(screen.getByTestId("llm-trace-detail-input")).toHaveTextContent("What next?");
      expect(screen.getByTestId("llm-trace-detail-answer")).toHaveTextContent(
        "Clarify the goal.",
      );
    });
  });

  it("shows empty list state", async () => {
    const user = userEvent.setup();
    renderApp(createClient({ list: [] }));
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("llm-traces-open"));
    await waitFor(() => {
      expect(screen.getByTestId("llm-trace-list-empty")).toBeInTheDocument();
    });
  });

  it("shows unconfigured state when Chat API URL is missing", async () => {
    const user = userEvent.setup();
    const storage = createMemoryPreferenceStorage();
    const conversationStore = createMemoryConversationStore({}, storage);
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={storage}
        conversationStore={conversationStore}
      />,
    );
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("llm-traces-open"));
    expect(screen.getByTestId("llm-trace-unconfigured")).toBeInTheDocument();
  });

  it("shows API error banner", async () => {
    const user = userEvent.setup();
    renderApp(createClient({ listError: "boom" }));
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("llm-traces-open"));
    await waitFor(() => {
      expect(screen.getByTestId("llm-trace-error")).toHaveTextContent("boom");
    });
  });
});
