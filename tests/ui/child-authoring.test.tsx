/** @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";
import { App } from "../../src/ui/App.js";
import { createMemoryPreferenceStorage } from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("child authoring UI", () => {
  it("shows Add a child question on the node and keeps zh-CN copy", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(
      <App
        initialSnapshot={focused.snapshot}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.getByTestId(`node-add-child-${ids.childA}`)).toHaveAttribute(
      "aria-label",
      "Add a child question",
    );

    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("locale-zh"));
    expect(screen.getByTestId(`node-add-child-${ids.childA}`)).toHaveAttribute(
      "aria-label",
      "添加子问题",
    );
  });

  it("validates empty question and goal locally without a global banner", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.childA}`));
    await user.click(screen.getByTestId("authoring-submit"));
    expect(screen.getByTestId("authoring-question-error")).toBeInTheDocument();
    expect(screen.getByTestId("authoring-goal-error")).toBeInTheDocument();
    expect(screen.queryByTestId("domain-error")).toBeNull();
  });

  it("creates an ordinary child on the tree via createChild", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.childA}`));
    await user.type(screen.getByTestId("authoring-question"), "New child");
    await user.type(screen.getByTestId("authoring-goal"), "Understand it");
    await user.click(screen.getByTestId("authoring-submit"));

    expect(screen.queryByTestId("authoring-form")).toBeNull();
    expect(screen.getByText("New child")).toBeInTheDocument();
    expect(screen.queryByTestId("authoring-must-resolve")).toBeNull();
  });

  it("does not expose blocking authoring on the node add-child form", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const activated = dispatchCommand(createSession(snapshot), {
      type: "activateNode",
      nodeId: ids.parent,
    });
    render(<App initialSnapshot={activated.snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.parent}`));
    expect(screen.getByTestId("authoring-form")).toBeInTheDocument();
    expect(screen.queryByTestId("authoring-must-resolve")).toBeNull();
  });

  it("hides add-child on a closed parent", () => {
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.childA,
    });
    const closed = createClosableNodeFixture(
      activated.snapshot,
      branch.ids.childA,
      ports,
    );
    const closedNode = dispatchCommand(createSession(closed), {
      type: "closeNode",
      nodeId: branch.ids.childA,
    });
    const focused = dispatchCommand(createSession(closedNode.snapshot), {
      type: "focusNode",
      nodeId: branch.ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    expect(
      screen.queryByTestId(`node-add-child-${branch.ids.childA}`),
    ).toBeNull();
    expect(
      screen.getByTestId(`node-completed-${branch.ids.childA}`),
    ).toBeInTheDocument();
  });

  it("shows authoring errors locally instead of the global banner", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.childA}`));
    const form = screen.getByTestId("authoring-form");
    expect(within(form).queryByTestId("domain-error")).toBeNull();
  });
});
