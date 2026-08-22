/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import { setNodeSummary } from "../../src/domain/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";
import { App } from "../../src/ui/App.js";
import {
  createWorkspace,
  type LearningWorkspace,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function renderFocused(snapshot: Parameters<typeof createWorkspace>[0][0]) {
  return render(<App initialSnapshot={snapshot} />);
}

describe("close readiness UI", () => {
  it("shows a missing summary, required marker, and disabled Complete before click", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const missingSummary = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
      { includeSummary: false },
    );
    const focused = dispatchCommand(createSession(missingSummary), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId("summary-required-marker")).toHaveTextContent("*");
    expect(screen.getByTestId("summary-status")).toHaveTextContent("Not filled yet");
    expect(screen.getByTestId("action-close")).toBeDisabled();
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Learning summary");
    expect(screen.queryByTestId("domain-error")).toBeNull();
  });

  it("removes the unmet summary requirement after a summary is added", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const missingSummary = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
      { includeSummary: false },
    );
    const focusedMissing = dispatchCommand(createSession(missingSummary), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    const { unmount } = renderFocused(focusedMissing.snapshot);
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Learning summary");

    const added = setNodeSummary(focusedMissing.snapshot, {
      nodeId: branch.ids.childA,
      summary: "Child A is understood.",
    });
    if (!added.ok) {
      throw new Error(added.error.kind);
    }
    unmount();
    renderFocused(added.snapshot);
    expect(screen.queryByTestId("close-unmet")).toBeNull();
    expect(screen.getByTestId("summary-status")).toHaveTextContent("Done");
    expect(screen.getByTestId("action-close")).toBeEnabled();
  });

  it("shows missing required evidence before click", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const missingEvidence = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
      { includeEvidence: false, evidenceRequired: true },
    );
    const focused = dispatchCommand(createSession(missingEvidence), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId("evidence-required-marker")).toHaveTextContent("*");
    expect(screen.getByTestId("close-unmet")).toHaveTextContent(
      "Add required evidence",
    );
    expect(screen.getByTestId("action-close")).toBeDisabled();
    expect(screen.queryByTestId("domain-error")).toBeNull();
  });

  it("shows unresolved children before click and never uses the global banner", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.parent,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId("action-close")).toBeDisabled();
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Child A");
    expect(screen.queryByTestId("domain-error")).toBeNull();
    await user.click(screen.getByTestId("action-close"));
    expect(screen.queryByTestId("domain-error")).toBeNull();
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("Learning");
  });

  it("enables Complete when the node is ready and still runs closeNode", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const closable = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
    );
    const focused = dispatchCommand(createSession(closable), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId("action-close")).toBeEnabled();
    await user.click(screen.getByTestId("action-close"));
    expect(screen.queryByTestId("domain-error")).toBeNull();
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("Completed");
  });

  it("places unexpected close failures beside Complete instead of the global banner", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const closable = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
    );
    const focused = dispatchCommand(createSession(closable), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    const workspace: LearningWorkspace = {
      ...createWorkspace([focused.snapshot]),
      lastError: {
        kind: "InvalidLifecycleTransition",
        nodeId: branch.ids.childA,
        from: "active",
        attempted: "close",
      },
      lastErrorCommand: "closeNode",
    };
    render(
      <App initialWorkspace={workspace} />,
    );

    expect(screen.getByTestId("node-action-error")).toHaveTextContent(
      "current learning state",
    );
    expect(screen.queryByTestId("domain-error")).toBeNull();
  });

  it("still uses the global banner for unattributed system errors", () => {
    const { snapshot } = createBlockedBranchFixture();
    const workspace: LearningWorkspace = {
      ...createWorkspace([snapshot]),
      lastError: {
        kind: "InvalidActiveStack",
        reason: "cycle in parent chain",
      },
    };
    render(<App initialWorkspace={workspace} />);
    expect(screen.getByTestId("domain-error")).toHaveTextContent(
      "contains a loop",
    );
    expect(screen.queryByTestId("node-action-error")).toBeNull();
  });
});
