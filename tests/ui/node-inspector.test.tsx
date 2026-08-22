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
  it("shows focused node fields without treating blocked as a lifecycle", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("To start");
    expect(screen.getByTestId("action-activate")).toHaveTextContent(
      "Start learning",
    );

    await user.click(screen.getByTestId(`node-${ids.q1}`));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId("inspector-lifecycle")).toHaveTextContent("Learning");
    expect(screen.getByTestId("action-activate")).toHaveClass("ui-button-ghost");
    expect(screen.getByTestId("action-park")).toHaveClass("ui-button-secondary");
    expect(screen.getByTestId("action-close")).toHaveClass("ui-button-primary");
    expect(screen.getByTestId("action-close")).toBeDisabled();
    expect(screen.getByTestId("inspector-blocked")).toHaveTextContent(
      "1 open sub-questions",
    );
    expect(screen.getByTestId("inspector-lifecycle")).not.toHaveTextContent(
      "blocked",
    );
  });

  it("uses Enter this question for a blocking child", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.childA,
    });
    render(<App initialSnapshot={focused.snapshot} />);
    expect(screen.getByTestId("action-activate")).toHaveTextContent(
      "Enter this question",
    );
  });
});
