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
  it("shows missing 心得 / Reflection status in Details", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const missingSummary = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childA,
      ports,
      { includeSummary: false },
    );
    const focused = dispatchCommand(createSession(missingSummary), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId("inspector-summary-heading")).toHaveTextContent(
      "Reflection",
    );
    expect(screen.getByTestId("summary-status")).toHaveTextContent(
      "Not filled yet",
    );
    expect(screen.queryByTestId("domain-error")).toBeNull();
  });

  it("clears the unmet summary hint after 心得 is saved", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const missingSummary = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childA,
      ports,
      { includeSummary: false },
    );
    const focusedMissing = dispatchCommand(createSession(missingSummary), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    const { unmount } = renderFocused(focusedMissing.snapshot);
    expect(screen.getByTestId("summary-status")).toBeInTheDocument();

    const added = setNodeSummary(focusedMissing.snapshot, {
      nodeId: branch.ids.childA,
      summary: "Child A is understood.",
    });
    if (!added.ok) {
      throw new Error(added.error.kind);
    }
    unmount();
    renderFocused(added.snapshot);
    expect(screen.queryByTestId("summary-status")).toBeNull();
    expect(screen.getByTestId(`node-complete-${branch.ids.childA}`)).toBeEnabled();
    await user.click(screen.getByTestId("inspector-summary"));
  });

  it("completes from open via the node control without Start Learning", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const closable = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childB,
      ports,
    );
    expect(closable.nodes[branch.ids.childB]?.lifecycle).toBe("open");
    const focused = dispatchCommand(createSession(closable), {
      type: "focusNode",
      nodeId: branch.ids.childB,
    });
    renderFocused(focused.snapshot);

    await user.click(screen.getByTestId(`node-complete-${branch.ids.childB}`));
    expect(screen.queryByTestId("domain-error")).toBeNull();
    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
    expect(screen.queryByTestId("action-activate")).toBeNull();
  });

  it("surfaces unmet blocking children by disabling Complete", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.parent,
    });
    renderFocused(focused.snapshot);

    expect(screen.getByTestId(`node-complete-${ids.parent}`)).toBeDisabled();
    expect(screen.getByTestId(`node-${ids.parent}`)).toHaveAttribute(
      "data-can-complete",
      "false",
    );
    expect(screen.queryByTestId("node-action-error")).toBeNull();
  });

  it("places unexpected close failures beside Details instead of the global banner", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const closable = createClosableNodeFixture(
      branch.snapshot,
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
    render(<App initialWorkspace={workspace} />);

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
        reason: "broken",
      },
      lastErrorCommand: "completePass",
    };
    render(<App initialWorkspace={workspace} />);
    expect(screen.getByTestId("domain-error")).toBeInTheDocument();
  });
});
