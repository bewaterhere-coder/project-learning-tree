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
  it("focuses knowledge deposition fields without learning-start ceremony", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId("inspector-dod-heading")).toHaveTextContent(
      "Completion criteria",
    );
    expect(screen.getByTestId("inspector-summary-heading")).toHaveTextContent(
      "Learning notes",
    );
    expect(screen.queryByTestId("action-activate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chat-open")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-add-sub-question")).not.toBeInTheDocument();

    await user.click(screen.getByTestId(`node-${ids.q1}`));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId("action-close")).toBeDisabled();
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Q1.2");
    expect(screen.queryByTestId("inspector-lifecycle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-park")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-return-to-parent")).not.toBeInTheDocument();
  });

  it("shows Complete for a focused blocking child without Start Learning", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);
    expect(screen.queryByTestId("action-activate")).not.toBeInTheDocument();
    expect(screen.getByTestId("action-close")).toBeInTheDocument();
  });
});
