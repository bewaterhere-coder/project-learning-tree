/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  createDemoTreeFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";
import { App } from "../../src/ui/App.js";
import { clickNodeComplete, openNodeMore } from "./node-more.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("tree interactions", () => {
  it("clicking a node only changes Current Focus", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId(`node-${ids.q11}`));

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1.1");
    expect(screen.getByTestId(`node-${ids.q1}`)).toHaveAttribute(
      "data-on-stack",
      "true",
    );
    expect(screen.getByTestId(`node-${ids.q1}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${ids.q11}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
    expect(screen.getByTestId(`node-${ids.q11}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
    expect(screen.getByTestId(`node-completed-${ids.q11}`)).toBeInTheDocument();
  });

  it("does not expose Start Learning activate controls", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    expect(screen.queryByTestId("action-activate")).toBeNull();
    await openNodeMore(user, ids.childA);
    expect(screen.getByTestId(`node-complete-${ids.childA}`)).toBeInTheDocument();
    await user.click(screen.getByTestId(`node-${ids.childB}`));
    expect(screen.queryByTestId("action-activate")).toBeNull();
    expect(screen.getByTestId(`node-${ids.childA}`)).toHaveAttribute(
      "data-lifecycle",
      "open",
    );
  });

  it("disables Complete on an unready Question instead of using Domain errors", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.parent,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await openNodeMore(user, ids.parent);
    const complete = screen.getByTestId(`node-complete-${ids.parent}`);
    expect(complete).toBeDisabled();
    expect(screen.getByTestId(`node-${ids.parent}`)).toHaveAttribute(
      "data-can-complete",
      "false",
    );
    await user.click(complete);
    expect(screen.queryByTestId("node-action-error")).toBeNull();
    expect(screen.getByTestId(`node-${ids.parent}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
  });

  it("closes a prepared open leaf without activateNode and without mutating stack", async () => {
    const user = userEvent.setup();
    const ports = sequentialFixturePorts();
    const branch = createBlockedBranchFixture(ports);
    const onParent = dispatchCommand(createSession(branch.snapshot), {
      type: "activateNode",
      nodeId: branch.ids.parent,
    });
    const closableB = createClosableNodeFixture(
      onParent.snapshot,
      branch.ids.childB,
      ports,
    );
    const focused = dispatchCommand(createSession(closableB), {
      type: "focusNode",
      nodeId: branch.ids.childB,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    expect(screen.getByTestId(`node-${branch.ids.parent}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "open",
    );

    await clickNodeComplete(user, branch.ids.childB);

    expect(screen.getByTestId(`node-${branch.ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
    expect(screen.getByTestId(`node-${branch.ids.parent}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${branch.ids.parent}`)).toHaveAttribute(
      "data-on-stack",
      "true",
    );
  });

  it("does not expose Return to Parent in Details", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);
    await user.click(screen.getByTestId(`node-${ids.q2}`));
    expect(screen.queryByTestId("action-return-to-parent")).toBeNull();
  });
});
