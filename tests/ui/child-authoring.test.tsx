/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import {
  applySelectedCommand,
  createWorkspace,
} from "../../src/workspace/index.js";
import { App } from "../../src/ui/App.js";
import {
  createClosableNodeFixture,
  createDemoTreeFixture,
  createMixedChildrenFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("child authoring UI", () => {
  it("shows Add a sub-question on a non-closed node and keeps zh-CN copy", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId("action-add-sub-question")).toHaveTextContent(
      "Add a sub-question",
    );

    await user.click(screen.getByTestId("locale-zh"));
    expect(screen.getByTestId("action-add-sub-question")).toHaveTextContent(
      "添加子问题",
    );

    await user.click(screen.getByTestId("locale-en"));
    await user.click(screen.getByTestId(`node-${ids.q12}`));
    expect(screen.getByTestId("action-add-sub-question")).toBeInTheDocument();
    expect(screen.queryByTestId("authoring-must-resolve")).not.toBeInTheDocument();
  });

  it("validates empty question and goal locally without a global banner", async () => {
    const user = userEvent.setup();
    const { snapshot } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId("action-add-sub-question"));
    await user.click(screen.getByTestId("authoring-submit"));
    expect(screen.getByTestId("authoring-question-error")).toHaveTextContent(
      "Enter a question.",
    );
    expect(screen.getByTestId("authoring-goal-error")).toHaveTextContent(
      "Enter a goal.",
    );
    expect(screen.queryByTestId("domain-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("authoring-error")).not.toBeInTheDocument();
  });

  it("creates an ordinary child on the tree without changing focus or stack", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId("action-add-sub-question"));
    await user.type(screen.getByTestId("authoring-question"), "How is packaging done?");
    await user.type(screen.getByTestId("authoring-goal"), "Understand packaging");
    expect(screen.queryByTestId("authoring-must-resolve")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("authoring-submit"));

    expect(screen.getAllByText("How is packaging done?").length).toBeGreaterThan(0);
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId("active-stack")).toHaveTextContent("Q1");
    expect(screen.getByTestId("active-stack")).not.toHaveTextContent(
      "How is packaging done?",
    );
    expect(screen.getByTestId(`node-${ids.q2}`)).toHaveAttribute(
      "data-blocked",
      "false",
    );
    expect(screen.queryByTestId("node-action-error")).not.toBeInTheDocument();
  });

  it("lets an active parent create a blocking child and toggle must-be-answered-first", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId(`node-${ids.parent}`)).toHaveAttribute(
      "data-blocked",
      "true",
    );
    expect(screen.getByTestId("inspector-blocked")).toHaveTextContent(
      "1 open sub-questions",
    );
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Blocking child");

    await user.click(screen.getByTestId("action-add-sub-question"));
    expect(screen.getByTestId("authoring-must-resolve")).toBeInTheDocument();
    await user.type(screen.getByTestId("authoring-question"), "Need this first");
    await user.type(screen.getByTestId("authoring-goal"), "Unblock parent");
    await user.click(screen.getByTestId("authoring-must-resolve"));
    await user.click(screen.getByTestId("authoring-submit"));

    expect(screen.getAllByText("Need this first").length).toBeGreaterThan(0);
    expect(screen.getByTestId("inspector-blocked")).toHaveTextContent(
      "2 open sub-questions",
    );
    expect(screen.getByTestId("close-unmet")).toHaveTextContent("Need this first");
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Parent");

    await user.click(screen.getByTestId(`child-must-resolve-${ids.ordinary}`));
    expect(screen.getByTestId("inspector-blocked")).toHaveTextContent(
      "3 open sub-questions",
    );
    await user.click(screen.getByTestId(`child-must-resolve-${ids.ordinary}`));
    expect(screen.getByTestId("inspector-blocked")).toHaveTextContent(
      "2 open sub-questions",
    );
  });

  it("disables adding and relationship controls on a closed parent", async () => {
    const ports = sequentialFixturePorts(5200);
    const mixed = createMixedChildrenFixture(ports);
    const childActive = dispatchCommand(createSession(mixed.snapshot), {
      type: "activateNode",
      nodeId: mixed.ids.blocking,
    });
    const closableChild = createClosableNodeFixture(
      childActive.snapshot,
      mixed.ids.blocking,
      ports,
    );
    const childClosed = dispatchCommand(createSession(closableChild), {
      type: "closeNode",
      nodeId: mixed.ids.blocking,
    });
    const closableParent = createClosableNodeFixture(
      childClosed.snapshot,
      mixed.ids.parent,
      ports,
    );
    const parentClosed = dispatchCommand(createSession(closableParent), {
      type: "closeNode",
      nodeId: mixed.ids.parent,
    });
    const focused = dispatchCommand(parentClosed, {
      type: "focusNode",
      nodeId: mixed.ids.parent,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    expect(screen.queryByTestId("action-add-sub-question")).not.toBeInTheDocument();
    expect(screen.getByTestId("authoring-closed-parent")).toHaveTextContent(
      "Completed questions can’t add sub-questions.",
    );
    expect(screen.getByTestId(`child-must-resolve-${mixed.ids.ordinary}`)).toBeDisabled();
    expect(screen.getByTestId(`child-must-resolve-${mixed.ids.blocking}`)).toBeDisabled();
  });

  it("shows authoring errors locally instead of the global banner", () => {
    const ports = sequentialFixturePorts(5000);
    const { snapshot } = createMixedChildrenFixture(ports);
    const failed = applySelectedCommand(
      createWorkspace([snapshot]),
      {
        type: "createChild",
        parentId: "missing-parent",
        question: "Ghost",
        goal: "Should fail",
      },
      ports,
    );
    render(<App initialWorkspace={failed} />);
    expect(screen.getByTestId("authoring-error")).toBeInTheDocument();
    expect(screen.queryByTestId("domain-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("node-action-error")).not.toBeInTheDocument();
  });

  it("keeps drag layout-only and never reparents", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);
    expect(screen.getByTestId("tree-nodes")).toHaveAttribute(
      "data-nodes-connectable",
      "false",
    );
    await user.click(screen.getByTestId(`node-drag-${ids.ordinary}`));
    expect(screen.getByTestId(`node-${ids.ordinary}`)).toHaveAttribute(
      "data-parent",
      ids.parent,
    );
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Parent");
  });

  it("does not use engineering terms in authoring copy", () => {
    const { snapshot } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);
    const body = document.body.textContent ?? "";
    expect(body).not.toContain("Exploratory Child");
    expect(body).not.toContain("Blocking Child");
    expect(body).not.toContain("Ordinary Child");
    expect(body).not.toContain("阻塞子节点");
    expect(body).not.toContain("探索型子问题");
    expect(body).not.toContain("blockingChildIds");
    expect(body).not.toContain("childIds");
  });
});
