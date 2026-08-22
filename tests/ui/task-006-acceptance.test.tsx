/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";
import { App } from "../../src/ui/App.js";
import {
  createWorkspace,
  setInspectorOpen,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("TASK-006 acceptance regressions", () => {
  it("disables Complete on an unready Question and enables it when ready from open", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const unready = dispatchCommand(createSession(branch.snapshot), {
      type: "focusNode",
      nodeId: branch.ids.childB,
    });
    const { unmount } = render(<App initialSnapshot={unready.snapshot} />);

    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "open",
    );
    expect(screen.getByTestId(`node-complete-${branch.ids.childB}`)).toBeDisabled();

    unmount();
    const ready = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childB,
      ports,
    );
    const focusedReady = dispatchCommand(createSession(ready), {
      type: "focusNode",
      nodeId: branch.ids.childB,
    });
    render(<App initialSnapshot={focusedReady.snapshot} />);

    const complete = screen.getByTestId(`node-complete-${branch.ids.childB}`);
    expect(complete).toBeEnabled();
    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-can-complete",
      "true",
    );
    await user.click(complete);
    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
  });

  it("does not open Details when Add Child or Complete run with Details closed", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const closable = createClosableNodeFixture(
      branch.snapshot,
      branch.ids.childB,
      ports,
    );
    const focused = dispatchCommand(createSession(closable), {
      type: "focusNode",
      nodeId: branch.ids.childB,
    });
    const closedDetails = setInspectorOpen(
      createWorkspace([focused.snapshot]),
      false,
    );
    render(<App initialWorkspace={closedDetails} />);

    expect(screen.queryByTestId("node-inspector")).toBeNull();

    await user.click(screen.getByTestId(`node-add-child-${branch.ids.childB}`));
    expect(screen.queryByTestId("node-inspector")).toBeNull();
    expect(screen.getByTestId("authoring-form")).toBeInTheDocument();
    await user.click(screen.getByTestId("authoring-cancel"));

    await user.click(screen.getByTestId(`node-complete-${branch.ids.childB}`));
    expect(screen.queryByTestId("node-inspector")).toBeNull();
    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
  });

  it("still opens Details when the Question card is clicked", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const closedDetails = setInspectorOpen(createWorkspace([snapshot]), false);
    render(<App initialWorkspace={closedDetails} />);

    expect(screen.queryByTestId("node-inspector")).toBeNull();
    await user.click(screen.getByTestId(`node-${ids.childA}`));
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Child A");
  });
});
