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

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("tree interactions", () => {
  it("clicking a node only changes Current Focus", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId(`node-${ids.q11}`));

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1.1");
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("closed");
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
    expect(screen.getByTestId("active-stack")).toHaveTextContent("Q1");
    expect(screen.getByTestId("active-stack")).not.toHaveTextContent("Q1.1");
  });

  it("activate updates from the new DomainSnapshot and clears the old active branch", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId("action-activate"));
    expect(screen.getByTestId(`node-${ids.childA}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${ids.childA}`)).toHaveAttribute(
      "data-on-stack",
      "true",
    );

    await user.click(screen.getByTestId(`node-${ids.childB}`));
    await user.click(screen.getByTestId("action-activate"));
    expect(screen.getByTestId(`node-${ids.childB}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${ids.childA}`)).toHaveAttribute(
      "data-lifecycle",
      "open",
    );
    expect(screen.getByTestId(`node-${ids.childA}`)).toHaveAttribute(
      "data-on-stack",
      "false",
    );
  });

  it("shows a DomainError when Close fails and leaves lifecycle unchanged", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q1,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId("action-close"));
    expect(screen.getByTestId("domain-error")).toHaveTextContent(
      "unresolved blocking children",
    );
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("active");
  });

  it("closes a prepared leaf and updates lifecycle and stack from Domain", async () => {
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
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId("action-close"));
    expect(screen.queryByTestId("domain-error")).toBeNull();
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("closed");
    expect(screen.getByTestId(`node-${branch.ids.childA}`)).toHaveAttribute(
      "data-lifecycle",
      "closed",
    );
    expect(screen.getByTestId("active-stack")).toHaveTextContent("Parent");
    expect(screen.getByTestId("active-stack")).not.toHaveTextContent("Child A");
  });

  it("Return to Parent only changes Focus", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q12,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    await user.click(screen.getByTestId("action-return-to-parent"));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId(`node-${ids.q12}`)).toHaveAttribute(
      "data-lifecycle",
      "parked",
    );
    expect(screen.getByTestId("active-stack")).toHaveTextContent("Q1");
    expect(screen.getByTestId(`node-${ids.q1}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
  });
});
