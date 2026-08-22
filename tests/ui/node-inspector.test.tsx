/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import { App } from "../../src/ui/App.js";
import {
  createBlockedBranchFixture,
  createDemoTreeFixture,
} from "../../src/fixtures/demo-tree.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("node inspector", () => {
  it("shows focused question details without Start Learning ceremony", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId("inspector-dod-heading")).toHaveTextContent(
      "Completion criteria",
    );
    expect(screen.getByTestId("inspector-summary-heading")).toHaveTextContent(
      "Reflection",
    );
    expect(screen.queryByTestId("action-activate")).toBeNull();
    expect(screen.queryByTestId("action-park")).toBeNull();
    expect(screen.queryByTestId("chat-open")).toBeNull();
    expect(screen.queryByTestId("action-add-sub-question")).toBeNull();
    expect(screen.queryByTestId("action-return-to-parent")).toBeNull();
    expect(screen.queryByTestId("inspector-lifecycle")).toBeNull();

    await user.click(screen.getByTestId(`node-${ids.q1}`));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId(`node-chat-${ids.q1}`)).toBeInTheDocument();
    expect(screen.getByTestId(`node-add-child-${ids.q1}`)).toBeInTheDocument();
    expect(screen.getByTestId(`node-complete-${ids.q1}`)).toBeInTheDocument();
  });

  it("keeps chat and add-child on the Question node for a blocking child", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);
    expect(screen.queryByTestId("action-activate")).toBeNull();
    expect(screen.getByTestId(`node-chat-${ids.childA}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`node-add-child-${ids.childA}`),
    ).toBeInTheDocument();
  });
});
